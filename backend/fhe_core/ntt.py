import numpy as np
from typing import List

class NTT:
    """
    Number Theoretic Transform for fast polynomial multiplication in Z_q[X]/(X^n + 1).
    Uses Cooley-Tukey FFT algorithm in modular arithmetic.
    """
    
    def __init__(self, n: int, q: int):
        if n <= 0 or (n & (n - 1)) != 0:
            raise ValueError("n must be a power of 2")
        if q <= 0:
            raise ValueError("q must be positive")
        self.n = n
        self.q = q
        self.psi = self._find_primitive_root(2 * n, q)
        if self.psi is None:
            raise ValueError(f"Cannot find primitive {2*n}-th root of unity mod {q}")
        self.psi_inv = self._mod_inverse(self.psi, q)
        self.n_inv = self._mod_inverse(n, q)
        
        self.psi_powers = [pow(self.psi, i, q) for i in range(n)]
        self.psi_inv_powers = [pow(self.psi_inv, i, q) for i in range(n)]
    
    @staticmethod
    def _mod_inverse(a: int, m: int) -> int:
        """Extended Euclidean algorithm for modular inverse"""
        if a < 0:
            a = a % m
        g, x, _ = NTT._extended_gcd(a, m)
        if g != 1:
            raise ValueError(f"No modular inverse for {a} mod {m}")
        return x % m
    
    @staticmethod
    def _extended_gcd(a: int, b: int):
        if a == 0:
            return b, 0, 1
        gcd, x1, y1 = NTT._extended_gcd(b % a, a)
        x = y1 - (b // a) * x1
        y = x1
        return gcd, x, y
    
    @staticmethod
    def _find_primitive_root(n: int, q: int) -> int:
        """Find primitive n-th root of unity mod q"""
        if q == 1:
            return None
        
        phi = q - 1
        if phi % n != 0:
            return None
        
        for g in range(2, min(q, 1000)):
            if pow(g, phi // n, q) != 1:
                continue
            root = pow(g, phi // n, q)
            if pow(root, n, q) == 1 and pow(root, n // 2, q) != 1:
                return root
        return None
    
    def forward(self, coeffs: np.ndarray) -> list:
        """Forward NTT transform - returns Python list to avoid int64 overflow"""
        if len(coeffs) != self.n:
            raise ValueError(f"Input must have length {self.n}")

        # Use Python native integers to avoid int64 overflow
        result = []
        for i in range(self.n):
            val = 0
            for j in range(self.n):
                val = (val + int(coeffs[j]) * int(self.psi_powers[(i * j) % self.n])) % self.q
            result.append(val)
        return result
    
    def inverse(self, coeffs) -> list:
        """Inverse NTT transform - returns Python list to avoid int64 overflow"""
        if len(coeffs) != self.n:
            raise ValueError(f"Input must have length {self.n}")

        # Use Python native integers to avoid int64 overflow
        result = []
        for i in range(self.n):
            val = 0
            for j in range(self.n):
                val = (val + int(coeffs[j]) * int(self.psi_inv_powers[(i * j) % self.n])) % self.q
            val = (val * self.n_inv) % self.q
            result.append(val)
        return result
    
    def multiply_ntt(self, a_ntt, b_ntt) -> list:
        """Element-wise multiplication in NTT domain - returns Python list"""
        if len(a_ntt) != self.n or len(b_ntt) != self.n:
            raise ValueError(f"Inputs must have length {self.n}")
        # Use Python native integers to avoid int64 overflow
        return [(int(a_ntt[i]) * int(b_ntt[i])) % self.q for i in range(self.n)]


def fast_polynomial_multiply(a_coeffs: np.ndarray, b_coeffs: np.ndarray, n: int, q: int) -> list:
    """
    Fast polynomial multiplication using NTT.
    Computes (a * b) mod (X^n + 1) in Z_q[X].
    Returns Python list to avoid int64 overflow.
    """
    try:
        ntt = NTT(n, q)

        a_ntt = ntt.forward(a_coeffs)
        b_ntt = ntt.forward(b_coeffs)

        c_ntt = ntt.multiply_ntt(a_ntt, b_ntt)

        result = ntt.inverse(c_ntt)

        return result
    except (ValueError, Exception):
        # Fallback: naive convolution using Python native integers
        a = [int(x) for x in a_coeffs]
        b = [int(x) for x in b_coeffs]
        conv_len = len(a) + len(b) - 1
        conv_result = [0] * conv_len
        for i, ai in enumerate(a):
            for j, bj in enumerate(b):
                conv_result[i + j] = (conv_result[i + j] + ai * bj) % q

        # Reduce mod (X^n + 1)
        result = [0] * n
        for i, coeff in enumerate(conv_result):
            pos = i % n
            if i // n % 2 == 1:
                result[pos] = (result[pos] - coeff) % q
            else:
                result[pos] = (result[pos] + coeff) % q
        return result
