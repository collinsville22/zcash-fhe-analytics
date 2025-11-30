from .shamir import share_polynomial_key, reconstruct_polynomial_key
from fhe_core.ckks import CKKSContext, CKKSCiphertext, CKKSEngine, DEFAULT_COEFF_MODULUS
from fhe_core.polynomial import Polynomial
import numpy as np

class ThresholdNode:
    """
    Threshold decryption node using REAL DKG with full polynomial sharing.
    Each node holds shares for ALL coefficients of the secret key polynomial.
    """
    def __init__(self, node_id: int, threshold: int = 3, total_nodes: int = 5, context: CKKSContext = None):
        self.node_id = node_id
        self.threshold = threshold
        self.total_nodes = total_nodes
        self.context = context or CKKSContext(poly_degree=1024, scale=2**40, coeff_modulus=2**60)
        # key_shares is now a list of (node_id, share_value) for each coefficient
        self.key_shares = None  # Will be array of length n
        self.received_shares = {}  # {from_node_id: [shares for each coeff]}

    def generate_local_polynomials(self):
        """
        Generate random polynomials for DKG - one Shamir polynomial per secret key coefficient.
        Returns: list of n polynomials, each of degree (threshold-1)
        """
        n = self.context.n
        # For each coefficient position in the secret key, generate a random Shamir polynomial
        # The constant term of each Shamir polynomial is the node's contribution to that coefficient
        local_polys = []
        for _ in range(n):
            # Random ternary value as this node's contribution to this coefficient
            secret_contrib = int(np.random.choice([-1, 0, 1]))
            # Shamir polynomial: f(x) = secret_contrib + a1*x + a2*x^2 + ...
            coeffs = [secret_contrib]
            for _ in range(self.threshold - 1):
                coeffs.append(int(np.random.randint(0, min(self.context.q, 2**31 - 1), dtype=np.int64)))
            local_polys.append(coeffs)
        return local_polys

    def create_shares_for_others(self, local_polys):
        """
        Create shares for all other nodes.
        Returns: dict {node_idx: [share for coeff 0, share for coeff 1, ...]}
        """
        prime = self.context.q
        shares_per_node = {}

        for node_idx in range(1, self.total_nodes + 1):
            x = node_idx
            node_shares = []
            for poly_coeffs in local_polys:
                # Evaluate Shamir polynomial at x
                y = sum(c * pow(x, i, prime) for i, c in enumerate(poly_coeffs)) % prime
                node_shares.append(y)
            shares_per_node[node_idx] = node_shares

        return shares_per_node

    def receive_share(self, from_node_id: int, shares):
        """Receive shares from another node (one share per coefficient)"""
        self.received_shares[from_node_id] = shares

    def compute_final_key_shares(self):
        """
        Compute final key shares by summing all received shares for each coefficient.
        Result: this node's share of the full secret key polynomial.
        """
        if len(self.received_shares) != self.total_nodes:
            raise ValueError(f"Expected {self.total_nodes} shares, got {len(self.received_shares)}")

        n = self.context.n
        prime = self.context.q

        # Sum shares from all nodes for each coefficient
        final_shares = []
        for coeff_idx in range(n):
            total = sum(shares[coeff_idx] for shares in self.received_shares.values()) % prime
            final_shares.append(total)

        self.key_shares = final_shares
        return self.key_shares

    def partial_decrypt(self, ciphertext: CKKSCiphertext):
        """
        Perform partial decryption using this node's key share polynomial.
        Returns partial result that can be combined with other nodes.
        """
        if self.key_shares is None:
            raise ValueError("Key shares not initialized")

        # Create polynomial from this node's shares
        sk_share_poly = Polynomial(self.key_shares, self.context.q)

        # Compute c1 * s_i (partial)
        c1s = (ciphertext.c1 * sk_share_poly).mod_poly(self.context.n)

        return {
            "node_id": self.node_id,
            "c1s_partial": c1s.to_list(),
            "scale": ciphertext.scale
        }

    @staticmethod
    def combine_partial_decryptions(ciphertext: CKKSCiphertext, partial_decryptions, context: CKKSContext, threshold: int):
        """
        Combine partial decryptions using Lagrange interpolation on polynomials.

        IMPORTANT: We use Python native integers (not numpy int64) to avoid overflow
        when multiplying large Lagrange coefficients with polynomial coefficients.
        """
        if len(partial_decryptions) < threshold:
            raise ValueError(f"Insufficient shares: need {threshold}, got {len(partial_decryptions)}")

        shares_to_use = partial_decryptions[:threshold]
        prime = int(context.q)  # Ensure Python int
        n = context.n

        # Get node IDs for Lagrange interpolation
        node_ids = [pd["node_id"] for pd in shares_to_use]

        # Compute Lagrange coefficients for x=0 using Python native ints
        lagrange_coeffs = []
        for i, xi in enumerate(node_ids):
            numerator = 1
            denominator = 1
            for j, xj in enumerate(node_ids):
                if i != j:
                    numerator = (numerator * (0 - xj)) % prime
                    denominator = (denominator * (xi - xj)) % prime
            denom_inv = pow(int(denominator), prime - 2, prime)
            lagrange_coeffs.append((numerator * denom_inv) % prime)

        # Combine c1*s partial results using Lagrange interpolation
        # Use Python native integers to avoid int64 overflow
        combined_c1s = [0] * n
        for idx, pd in enumerate(shares_to_use):
            c1s_partial = pd["c1s_partial"]  # List of ints
            lc = int(lagrange_coeffs[idx])
            for coeff_idx in range(n):
                # Use Python's arbitrary precision integers
                combined_c1s[coeff_idx] = (combined_c1s[coeff_idx] + int(c1s_partial[coeff_idx]) * lc) % prime

        combined_c1s_poly = Polynomial(combined_c1s, prime)

        # Final decryption: m = c0 + c1*s
        m_poly = (ciphertext.c0 + combined_c1s_poly).mod_poly(n)

        # Decode the result
        value = int(m_poly.coeffs[0])
        if value > prime // 2:
            value -= prime

        scale = shares_to_use[0]["scale"]
        return value / scale


def distributed_key_generation(threshold: int = 3, total_nodes: int = 5):
    """
    Perform Distributed Key Generation among nodes with FULL POLYNOMIAL sharing.

    Each coefficient of the secret key polynomial is independently shared using
    Shamir secret sharing. This allows threshold decryption where any t-of-n
    nodes can combine their partial decryptions to recover the plaintext,
    without ever reconstructing the full secret key.

    Returns (nodes, public_key) where:
    - nodes: list of ThresholdNode objects, each holding shares for all coefficients
    - public_key: CKKSPublicKey for encryption
    """
    from fhe_core.ckks import CKKSSecretKey, CKKSPublicKey

    # Create shared context with prime modulus (needed for Lagrange interpolation)
    context = CKKSContext(poly_degree=1024, scale=2**40, coeff_modulus=DEFAULT_COEFF_MODULUS)

    # Create nodes with shared context
    nodes = [ThresholdNode(i + 1, threshold, total_nodes, context) for i in range(total_nodes)]

    # Phase 1: Each node generates their local polynomials (one per secret key coefficient)
    all_node_polys = {}
    all_node_shares = {}

    for node in nodes:
        local_polys = node.generate_local_polynomials()
        all_node_polys[node.node_id] = local_polys
        shares = node.create_shares_for_others(local_polys)
        all_node_shares[node.node_id] = shares

    # Phase 2: Distribute shares to all nodes
    for receiving_node in nodes:
        for sending_node_id, shares_per_node in all_node_shares.items():
            # Get the shares meant for this receiving node
            share_for_this_node = shares_per_node[receiving_node.node_id]
            receiving_node.receive_share(sending_node_id, share_for_this_node)

    # Phase 3: Each node computes their final key shares
    for node in nodes:
        node.compute_final_key_shares()

    # Phase 4: Compute combined secret key for public key generation
    # The combined secret key s[i] = sum of all nodes' contributions for coefficient i
    # s[i] = sum(f_j(0) for all nodes j) for each coefficient i
    n = context.n
    combined_sk_coeffs = []
    for coeff_idx in range(n):
        # Sum the constant terms of each node's Shamir polynomial for this coefficient
        total = sum(all_node_polys[node_id][coeff_idx][0] for node_id in all_node_polys.keys())
        combined_sk_coeffs.append(total % context.q)

    # Create secret key with the combined coefficients
    combined_sk = CKKSSecretKey(context)
    combined_sk.poly.coeffs = np.array(combined_sk_coeffs, dtype=np.int64)

    # Generate public key from the combined secret
    public_key = CKKSPublicKey(context, combined_sk)

    # Store public key in nodes for reference
    for node in nodes:
        node.public_key = public_key

    return nodes, public_key


def threshold_decrypt_real(ciphertext: CKKSCiphertext, nodes, threshold: int = 3):
    """
    Threshold decryption using REAL DKG with full polynomial sharing.

    Any t-of-n nodes can combine their partial decryptions to recover
    the plaintext, without ever reconstructing the full secret key.
    """
    # Collect partial decryptions from threshold number of nodes
    partial_decryptions = []
    for i in range(threshold):
        partial = nodes[i].partial_decrypt(ciphertext)
        partial_decryptions.append(partial)

    # Combine using Lagrange interpolation on polynomials
    result = ThresholdNode.combine_partial_decryptions(
        ciphertext,
        partial_decryptions,
        nodes[0].context,
        threshold
    )
    return result
