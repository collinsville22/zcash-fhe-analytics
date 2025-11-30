from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from oracle import Oracle
from analytics_suite import FHEAnalytics
from threshold.threshold_decrypt import simulate_threshold_network, threshold_decrypt
from fhe_core.ckks import CKKSContext, CKKSPublicKey, CKKSCiphertext, CKKSEngine
import os
import logging
import time
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
CORS(app)

app.config['JSON_SORT_KEYS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({"error": "Internal server error"}), 500

@app.route('/')
def serve_index():
    return send_from_directory(frontend_dir, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(frontend_dir, path)

try:
    oracle = Oracle()

    # Perform Distributed Key Generation - returns nodes with key shares
    # AND a public key that corresponds to the distributed secret
    from threshold.dkg import distributed_key_generation, threshold_decrypt_real

    threshold_nodes, ckks_pk = distributed_key_generation(threshold=3, total_nodes=5)
    ckks_context = threshold_nodes[0].context

    from analytics_suite import FHEAnalytics
    analytics = FHEAnalytics(ckks_context, ckks_pk)

    encrypted_swaps: List[Dict[str, Any]] = []
    encrypted_transactions: List[Dict[str, Any]] = []

    logger.info("=" * 70)
    logger.info("Production Zcash FHE Analytics initialized with THRESHOLD DECRYPTION")
    logger.info(f"CKKS Context: poly_degree={ckks_context.n}, scale={ckks_context.scale}")
    logger.info(f"Threshold: 3-of-5 nodes required for decryption")
    logger.info("=" * 70)
except Exception as e:
    logger.critical(f"Failed to initialize system: {e}")
    raise

@app.route('/api/keys/fhe_public', methods=['GET'])
def get_fhe_public_key():
    try:
        pk_a = ckks_pk.a.to_list()
        pk_b = ckks_pk.b.to_list()

        return jsonify({
            "poly_degree": ckks_context.n,
            "scale": float(ckks_context.scale),
            "coeff_modulus": int(ckks_context.q),
            "public_key": {
                "a": pk_a,
                "b": pk_b
            },
            "algorithm": "CKKS-FHE"
        })
    except Exception as e:
        logger.error(f"FHE public key error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ingest/swap', methods=['POST'])
def ingest_swap():
    try:
        data = request.json
        
        ct_amount_in = CKKSCiphertext.from_dict(data['encrypted_amount_in'], ckks_context)
        ct_amount_out = CKKSCiphertext.from_dict(data['encrypted_amount_out'], ckks_context)
        ct_fee = CKKSCiphertext.from_dict(data['encrypted_fee'], ckks_context)
        
        swap_record = {
            'ciphertext_amount_in': ct_amount_in,
            'ciphertext_amount_out': ct_amount_out,
            'ciphertext_fee': ct_fee,
            'destination_asset': data.get('destination_asset', 'UNKNOWN'),
            'timestamp': data.get('timestamp', int(time.time() * 1000)),
            'platform': data.get('platform', 'unknown'),
            'swap_type': data.get('swap_type', 'swap')
        }
        
        encrypted_swaps.append(swap_record)
        
        return jsonify({
            "status": "success",
            "swap_id": len(encrypted_swaps),
            "destination": data.get('destination_asset'),
            "platform": data.get('platform'),
            "note": "Swap stored in encrypted form. Individual amounts never decrypted."
        }), 200
        
    except Exception as e:
        logger.error(f"Swap ingestion error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ingest/transaction', methods=['POST'])
def ingest_transaction():
    try:
        data = request.json
        
        ct_amount = CKKSCiphertext.from_dict(data['encrypted_amount'], ckks_context)
        ct_fee = CKKSCiphertext.from_dict(data.get('encrypted_fee', {}), ckks_context) if data.get('encrypted_fee') else None
        
        tx_record = {
            'ciphertext_amount': ct_amount,
            'ciphertext_fee': ct_fee,
            'tx_type': data.get('tx_type', 'send'),
            'pool_type': data.get('pool_type'),
            'platform': data.get('platform', 'unknown'),
            'timestamp': data.get('timestamp', int(time.time() * 1000))
        }
        
        if 'encrypted_transactions' not in globals():
            global encrypted_transactions
            encrypted_transactions = []
        
        encrypted_transactions.append(tx_record)
        
        return jsonify({
            "status": "success",
            "tx_id": len(encrypted_transactions),
            "tx_type": data.get('tx_type'),
            "platform": data.get('platform')
        }), 200
        
    except Exception as e:
        logger.error(f"Transaction ingestion error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/swaps/count', methods=['GET'])
def get_swaps_count():
    try:
        count = len(encrypted_swaps)
        
        if count == 0:
            return jsonify({"count": 0})
        
        destinations = {}
        platforms = {}
        for swap in encrypted_swaps:
            dest = swap.get('destination_asset', 'UNKNOWN')
            destinations[dest] = destinations.get(dest, 0) + 1
            
            plat = swap.get('platform', 'unknown')
            platforms[plat] = platforms.get(plat, 0) + 1
        
        return jsonify({
            "count": count,
            "by_destination": destinations,
            "by_platform": platforms,
            "note": "Individual amounts encrypted. Use /api/analytics/aggregate for totals."
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/aggregate', methods=['GET'])
def get_aggregates():
    try:
        if len(encrypted_swaps) == 0:
            return jsonify({"error": "No swaps available"}), 400
        
        ciphertexts = [s['ciphertext_amount_in'] for s in encrypted_swaps]
        encrypted_total = analytics.sum(ciphertexts)
        
        decrypted_total = threshold_decrypt_real(encrypted_total, threshold_nodes, threshold=3)
        
        fee_cts = [s['ciphertext_fee'] for s in encrypted_swaps]
        encrypted_fees = analytics.sum(fee_cts)
        decrypted_fees = threshold_decrypt_real(encrypted_fees, threshold_nodes, threshold=3)
        
        return jsonify({
            "total_volume_zec": float(decrypted_total),
            "total_fees_zec": float(decrypted_fees),
            "num_swaps": len(encrypted_swaps),
            "average_swap_zec": float(decrypted_total) / len(encrypted_swaps),
            "privacy_note": "Computed on encrypted data. Individual swaps never revealed."
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/transactions', methods=['GET'])
def get_transaction_analytics():
    try:
        if len(encrypted_transactions) == 0:
            return jsonify({
                "total_volume_zec": 0,
                "total_fees_zec": 0,
                "num_transactions": 0,
                "by_type": {},
                "by_pool": {},
                "by_platform": {}
            })
        
        ciphertexts = [tx['ciphertext_amount'] for tx in encrypted_transactions]
        encrypted_total = analytics.sum(ciphertexts)
        decrypted_total = threshold_decrypt_real(encrypted_total, threshold_nodes, threshold=3)
        
        fee_cts = [tx['ciphertext_fee'] for tx in encrypted_transactions if tx['ciphertext_fee']]
        encrypted_fees = analytics.sum(fee_cts) if fee_cts else None
        decrypted_fees = threshold_decrypt_real(encrypted_fees, threshold_nodes, threshold=3) if encrypted_fees else 0
        
        by_type = {}
        by_pool = {}
        by_platform = {}
        
        for tx in encrypted_transactions:
            tx_type = tx.get('tx_type', 'unknown')
            by_type[tx_type] = by_type.get(tx_type, 0) + 1
            
            pool = tx.get('pool_type', 'unknown')
            if pool:
                by_pool[pool] = by_pool.get(pool, 0) + 1
            
            platform = tx.get('platform', 'unknown')
            by_platform[platform] = by_platform.get(platform, 0) + 1
        
        return jsonify({
            "total_volume_zec": float(decrypted_total),
            "total_fees_zec": float(decrypted_fees),
            "num_transactions": len(encrypted_transactions),
            "average_amount_zec": float(decrypted_total) / len(encrypted_transactions),
            "by_type": by_type,
            "by_pool": by_pool,
            "by_platform": by_platform
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "operational",
        "version": "2.0.0-production",
        "encryption": "CKKS-FHE",
        "threshold_nodes": len(threshold_nodes),
        "encrypted_swaps": len(encrypted_swaps),
        "encrypted_transactions": len(encrypted_transactions)
    })

@app.route('/api/reset', methods=['POST'])
def reset_data():
    global encrypted_swaps, encrypted_transactions
    encrypted_swaps = []
    encrypted_transactions = []
    logger.info("All encrypted data cleared for demo")
    return jsonify({
        "status": "reset",
        "swaps": 0,
        "transactions": 0
    })

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
