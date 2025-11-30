from .shamir import share_polynomial_key, reconstruct_polynomial_key
from fhe_core.ckks import CKKSContext, CKKSSecretKey, CKKSCiphertext, CKKSEngine
from fhe_core.polynomial import Polynomial

class ThresholdOracle:
    def __init__(self, node_id: int, threshold: int = 3, total_nodes: int = 5):
        self.node_id = node_id
        self.threshold = threshold
        self.total_nodes = total_nodes
        self.context = CKKSContext(poly_degree=1024, scale=2**40, coeff_modulus=2**60)
        self.key_share = None
        self._full_secret_key = None
    
    def generate_shared_keys(self):
        full_sk = CKKSSecretKey(self.context)
        self._full_secret_key = full_sk
        sk_coeffs = full_sk.poly.coeffs
        prime = self.context.q
        all_shares = share_polynomial_key(sk_coeffs, self.threshold, self.total_nodes, prime)
        return all_shares
    
    def set_key_share(self, key_share):
        self.key_share = key_share
    
    def partial_decrypt(self, ciphertext: CKKSCiphertext):
        if self.key_share is None:
            raise ValueError("Key share not initialized")
        return {
            "node_id": self.node_id,
            "share": self.key_share,
            "ciphertext_c0": ciphertext.c0.to_list(),
            "ciphertext_c1": ciphertext.c1.to_list(),
            "scale": ciphertext.scale
        }
    
    def combine_partial_decryptions(self, partial_decryptions):
        if len(partial_decryptions) < self.threshold:
            raise ValueError(f"Insufficient shares: need {self.threshold}, got {len(partial_decryptions)}")
        shares_to_use = partial_decryptions[:self.threshold]
        prime = self.context.q
        key_shares = [pd["share"] for pd in shares_to_use]
        reconstructed_coeffs = reconstruct_polynomial_key(key_shares, self.threshold, prime)
        sk_poly = Polynomial(reconstructed_coeffs, self.context.q)
        c0 = Polynomial.from_list(shares_to_use[0]["ciphertext_c0"], self.context.q)
        c1 = Polynomial.from_list(shares_to_use[0]["ciphertext_c1"], self.context.q)
        scale = shares_to_use[0]["scale"]
        ciphertext = CKKSCiphertext(c0, c1, self.context, scale)
        
        class TempSecretKey:
            def __init__(self, poly, context):
                self.poly = poly
                self.context = context
        
        temp_sk = TempSecretKey(sk_poly, self.context)
        engine = CKKSEngine(self.context)
        return engine.decrypt(ciphertext, temp_sk)

def simulate_threshold_network(threshold: int = 3, total_nodes: int = 5):
    nodes = []
    coordinator = ThresholdOracle(1, threshold, total_nodes)
    all_shares = coordinator.generate_shared_keys()
    for i in range(total_nodes):
        node = ThresholdOracle(i + 1, threshold, total_nodes)
        node.set_key_share(all_shares[i])
        nodes.append(node)
    return nodes, coordinator._full_secret_key

def threshold_decrypt(ciphertext: CKKSCiphertext, nodes, threshold: int = 3):
    partial_decryptions = []
    for i in range(threshold):
        partial = nodes[i].partial_decrypt(ciphertext)
        partial_decryptions.append(partial)
    result = nodes[0].combine_partial_decryptions(partial_decryptions)
    return result
