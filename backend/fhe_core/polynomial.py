import numpy as np
from typing import List, Union

class Polynomial:
    def __init__(self, coeffs: Union[List[int], np.ndarray], modulus: int):
        if modulus <= 0:
            raise ValueError("Modulus must be positive")
        self.coeffs = np.array(coeffs, dtype=np.int64) % modulus
        self.modulus = modulus

    def __add__(self, other: 'Polynomial') -> 'Polynomial':
        if self.modulus != other.modulus:
            raise ValueError("Polynomials must have same modulus")
        max_len = max(len(self.coeffs), len(other.coeffs))
        a = np.pad(self.coeffs, (0, max_len - len(self.coeffs)))
        b = np.pad(other.coeffs, (0, max_len - len(other.coeffs)))
        return Polynomial((a + b) % self.modulus, self.modulus)

    def __mul__(self, other: 'Polynomial') -> 'Polynomial':
        if self.modulus != other.modulus:
            raise ValueError("Polynomials must have same modulus")

        try:
            from .ntt import fast_polynomial_multiply
            if len(self.coeffs) == len(other.coeffs) and ((len(self.coeffs) & (len(self.coeffs) - 1)) == 0):
                result = fast_polynomial_multiply(self.coeffs, other.coeffs, len(self.coeffs), self.modulus)
                return Polynomial(result, self.modulus)
        except (ImportError, ValueError, Exception):
            pass

        # Use Python native integers to avoid int64 overflow during convolution
        # np.polymul would overflow for large coefficient products
        a = [int(x) for x in self.coeffs]
        b = [int(x) for x in other.coeffs]
        result_len = len(a) + len(b) - 1
        result = [0] * result_len
        for i, ai in enumerate(a):
            for j, bj in enumerate(b):
                result[i + j] = (result[i + j] + ai * bj) % self.modulus
        return Polynomial(result, self.modulus)

    def mod_poly(self, n: int) -> 'Polynomial':
        if n <= 0:
            raise ValueError("Polynomial degree must be positive")
        result_coeffs = np.zeros(n, dtype=np.int64)
        for i, coeff in enumerate(self.coeffs):
            pos = i % n
            if i // n % 2 == 1:
                result_coeffs[pos] = (result_coeffs[pos] - coeff) % self.modulus
            else:
                result_coeffs[pos] = (result_coeffs[pos] + coeff) % self.modulus
        return Polynomial(result_coeffs, self.modulus)

    def to_list(self) -> List[int]:
        return self.coeffs.tolist()

    @staticmethod
    def from_list(data: List[int], modulus: int) -> 'Polynomial':
        if not data:
            raise ValueError("Cannot create polynomial from empty list")
        return Polynomial(data, modulus)
