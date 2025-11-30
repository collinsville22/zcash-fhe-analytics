import random
from typing import List, Tuple

class ShamirSecretSharing:
    def __init__(self, prime):
        self.prime = prime
    
    def _eval_poly(self, coeffs, x):
        result = 0
        for i, coeff in enumerate(coeffs):
            result += coeff * pow(x, i, self.prime)
            result %= self.prime
        return result
    
    def split_secret(self, secret: int, threshold: int, num_shares: int) -> List[Tuple[int, int]]:
        if threshold > num_shares:
            raise ValueError("Threshold exceeds total shares")
        coeffs = [secret] + [random.randint(0, self.prime - 1) for _ in range(threshold - 1)]
        shares = []
        for i in range(1, num_shares + 1):
            shares.append((i, self._eval_poly(coeffs, i)))
        return shares
    
    def reconstruct_secret(self, shares: List[Tuple[int, int]]) -> int:
        if not shares:
            raise ValueError("No shares provided")
        secret = 0
        for i, (xi, yi) in enumerate(shares):
            numerator = 1
            denominator = 1
            for j, (xj, _) in enumerate(shares):
                if i != j:
                    numerator *= (0 - xj)
                    denominator *= (xi - xj)
            denom_inv = self._mod_inverse(denominator, self.prime)
            li_0 = (numerator * denom_inv) % self.prime
            secret += (yi * li_0)
            secret %= self.prime
        return secret
    
    def _mod_inverse(self, a, m):
        m0, y, x = m, 0, 1
        while a > 1:
            q = a // m
            m, a = a % m, m
            y, x = x - q * y, y
        return x + m0 if x < 0 else x

def share_polynomial_key(poly_coeffs, threshold, num_shares, prime):
    sharer = ShamirSecretSharing(prime)
    all_shares = []
    for coeff in poly_coeffs:
        shares = sharer.split_secret(int(coeff), threshold, num_shares)
        all_shares.append(shares)
    party_shares = []
    for i in range(num_shares):
        party_i_shares = [coeff_shares[i] for coeff_shares in all_shares]
        party_shares.append(party_i_shares)
    return party_shares

def reconstruct_polynomial_key(party_shares, threshold, prime):
    sharer = ShamirSecretSharing(prime)
    num_coeffs = len(party_shares[0])
    reconstructed_coeffs = []
    for coeff_idx in range(num_coeffs):
        shares_for_coeff = [party[coeff_idx] for party in party_shares]
        coeff = sharer.reconstruct_secret(shares_for_coeff[:threshold])
        reconstructed_coeffs.append(coeff)
    return reconstructed_coeffs
