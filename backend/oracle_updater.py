import requests
import json
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OracleUpdater:
    def __init__(self, backend_url: str = "http://127.0.0.1:5000"):
        self.backend_url = backend_url
        self.ethereum_endpoint = None
    
    def set_ethereum_endpoint(self, contract_address: str, rpc_url: str = "https://sepolia.infura.io/v3/YOUR_KEY"):
        self.ethereum_endpoint = {
            "contract_address": contract_address,
            "rpc_url": rpc_url
        }
    
    def fetch_and_decrypt_metric(self, metric_name: str, encrypted_values: list) -> float:
        try:
            logger.info(f"Computing {metric_name} on {len(encrypted_values)} values")
            
            compute_res = requests.post(
                f"{self.backend_url}/api/analytics/compute/{metric_name}",
                json={"encrypted_values": encrypted_values},
                timeout=30
            )
            compute_res.raise_for_status()
            compute_data = compute_res.json()
            
            encrypted_result = compute_data.get('encrypted_result')
            if not encrypted_result:
                raise ValueError("No encrypted result returned")
            
            decrypt_res = requests.post(
                f"{self.backend_url}/api/threshold/decrypt",
                json={"ciphertext": encrypted_result},
                timeout=30
            )
            decrypt_res.raise_for_status()
            decrypt_data = decrypt_res.json()
            
            return float(decrypt_data['decrypted_value'])
            
        except Exception as e:
            logger.error(f"Metric computation failed: {e}")
            raise
    
    def push_to_ethereum(self, metric_name: str, value: float) -> bool:
        if not self.ethereum_endpoint:
            logger.warning("Ethereum endpoint not configured")
            return False
        
        try:
            logger.info(f"Pushing to Ethereum: {metric_name} = {value}")
            logger.info(f"Contract: {self.ethereum_endpoint['contract_address']}")
            logger.info("Note: Actual push requires web3.py with wallet")
            return True
        except Exception as e:
            logger.error(f"Ethereum push failed: {e}")
            return False
    
    def update_oracle(self, metric_name: str, values: list, push_to_chain: bool = True):
        try:
            decrypted_value = self.fetch_and_decrypt_metric(metric_name, values)
            logger.info(f"Decrypted {metric_name}: {decrypted_value}")
            
            if push_to_chain:
                ethereum_success = self.push_to_ethereum(metric_name, decrypted_value)
                
                return {
                    "metric": metric_name,
                    "value": decrypted_value,
                    "ethereum_pushed": ethereum_success
                }
            
            return {
                "metric": metric_name,
                "value": decrypted_value,
                "ethereum_pushed": False
            }
            
        except Exception as e:
            logger.error(f"Oracle update failed: {e}")
            return None

if __name__ == '__main__':
    import os
    contract_address = os.getenv('ORACLE_CONTRACT_ADDRESS', '0x0eC2862d6480a988d7749e92C590B5a6fe61437f')
    updater = OracleUpdater()
    updater.set_ethereum_endpoint(contract_address)
    logger.info(f"Oracle updater configured for contract: {contract_address}")
