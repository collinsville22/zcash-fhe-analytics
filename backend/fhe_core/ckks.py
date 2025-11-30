import numpy as np
import random
from typing import Dict, Any, TYPE_CHECKING
from .polynomial import Polynomial

if TYPE_CHECKING:
    from .relinearization import RelinearizationKey

DEFAULT_COEFF_MODULUS = 1152921504606846883  # Prime close to 2^60, needed for modular inverse in threshold decryption

class CKKSContext:
    def __init__(self, poly_degree: int = 8192, scale: float = 2**40, coeff_modulus: int = DEFAULT_COEFF_MODULUS):
        if poly_degree <= 0 or (poly_degree & (poly_degree - 1)) != 0:
            raise ValueError("Polynomial degree must be a power of 2")
        if scale <= 0:
            raise ValueError("Scale must be positive")
        if coeff_modulus <= 0:
            raise ValueError("Coefficient modulus must be positive")
        if coeff_modulus >= 2**63:
            raise ValueError("Coefficient modulus must be less than 2^63")
        self.n = poly_degree
        self.scale = scale
        self.q = coeff_modulus
        self.slots = poly_degree // 2

class CKKSSecretKey:
    def __init__(self, context: CKKSContext):
        coeffs = np.random.choice([-1, 0, 1], size=context.n)
        self.poly = Polynomial(coeffs, context.q)
        self.context = context

class CKKSPublicKey:
    def __init__(self, context: CKKSContext, secret_key: CKKSSecretKey):
        if context.n != secret_key.context.n:
            raise ValueError("Context mismatch")
        self.context = context
        a_coeffs = [int(np.random.randint(0, min(context.q, 2**31 - 1), dtype=np.int64)) for _ in range(context.n)]
        self.a = Polynomial(a_coeffs, context.q)
        e_coeffs = [int(np.random.randint(-3, 4, dtype=np.int64)) for _ in range(context.n)]
        self.e = Polynomial(e_coeffs, context.q)
        as_poly = self.a * secret_key.poly
        as_poly = as_poly.mod_poly(context.n)
        neg_as_coeffs = (-as_poly.coeffs) % context.q
        neg_as = Polynomial(neg_as_coeffs, context.q)
        self.b = (neg_as + self.e).mod_poly(context.n)

class CKKSCiphertext:
    def __init__(self, c0: Polynomial, c1: Polynomial, context: CKKSContext, scale: float):
        if c0.modulus != context.q or c1.modulus != context.q:
            raise ValueError("Ciphertext modulus mismatch")
        if scale <= 0:
            raise ValueError("Scale must be positive")
        self.c0 = c0
        self.c1 = c1
        self.context = context
        self.scale = scale

    def __add__(self, other: 'CKKSCiphertext') -> 'CKKSCiphertext':
        if not isinstance(other, CKKSCiphertext):
            raise TypeError("Can only add CKKSCiphertext objects")
        if abs(self.scale - other.scale) > 1e-6:
            raise ValueError("Ciphertexts must have matching scales")
        if self.context.q != other.context.q:
            raise ValueError("Context mismatch")
        new_c0 = (self.c0 + other.c0).mod_poly(self.context.n)
        new_c1 = (self.c1 + other.c1).mod_poly(self.context.n)
        return CKKSCiphertext(new_c0, new_c1, self.context, self.scale)

    def __mul__(self, other: 'CKKSCiphertext') -> 'CKKSCiphertext':
        if not isinstance(other, CKKSCiphertext):
            raise TypeError("Can only multiply CKKSCiphertext objects")
        if self.context.q != other.context.q:
            raise ValueError("Context mismatch")
        
        c0_c0 = (self.c0 * other.c0).mod_poly(self.context.n)
        c0_c1 = (self.c0 * other.c1).mod_poly(self.context.n)
        c1_c0 = (self.c1 * other.c0).mod_poly(self.context.n)
        
        new_c0 = c0_c0.mod_poly(self.context.n)
        new_c1 = (c0_c1 + c1_c0).mod_poly(self.context.n)
        
        new_scale = self.scale * other.scale
        
        return CKKSCiphertext(new_c0, new_c1, self.context, new_scale)

    def rescale(self) -> 'CKKSCiphertext':
        if self.scale < self.context.scale:
            raise ValueError("Cannot rescale: scale too small")
        new_scale = self.scale / self.context.scale
        new_c0_coeffs = np.round(self.c0.coeffs.astype(np.float64) / self.context.scale).astype(np.int64)
        new_c1_coeffs = np.round(self.c1.coeffs.astype(np.float64) / self.context.scale).astype(np.int64)
        new_c0 = Polynomial(new_c0_coeffs, self.context.q)
        new_c1 = Polynomial(new_c1_coeffs, self.context.q)
        return CKKSCiphertext(new_c0, new_c1, self.context, new_scale)

    def to_dict(self) -> Dict[str, Any]:
        return {"c0": self.c0.to_list(), "c1": self.c1.to_list(), "scale": float(self.scale)}

    @staticmethod
    def from_dict(data: Dict[str, Any], context: CKKSContext) -> 'CKKSCiphertext':
        if "c0" not in data or "c1" not in data:
            raise ValueError("Invalid ciphertext format")
        c0 = Polynomial.from_list(data["c0"], context.q)
        c1 = Polynomial.from_list(data["c1"], context.q)
        scale = data.get("scale", context.scale)
        return CKKSCiphertext(c0, c1, context, scale)

class CKKSCiphertextExtended:
    """Extended ciphertext with 3 components from multiplication, needs relinearization"""
    def __init__(self, c0: Polynomial, c1: Polynomial, c2: Polynomial, context: CKKSContext, scale: float):
        if c0.modulus != context.q or c1.modulus != context.q or c2.modulus != context.q:
            raise ValueError("Ciphertext modulus mismatch")
        if scale <= 0:
            raise ValueError("Scale must be positive")
        self.c0 = c0
        self.c1 = c1
        self.c2 = c2
        self.context = context
        self.scale = scale
    
    def relinearize(self, relin_key: 'RelinearizationKey') -> CKKSCiphertext:
        """Reduce from 3 components back to 2 using relinearization key"""
        if relin_key.context.n != self.context.n:
            raise ValueError("Relinearization key context mismatch")
        
        rlk0_c2 = (relin_key.rlk0 * self.c2).mod_poly(self.context.n)
        rlk1_c2 = (relin_key.rlk1 * self.c2).mod_poly(self.context.n)
        
        new_c0 = (self.c0 + rlk0_c2).mod_poly(self.context.n)
        new_c1 = (self.c1 + rlk1_c2).mod_poly(self.context.n)
        
        return CKKSCiphertext(new_c0, new_c1, self.context, self.scale)

    def to_dict(self) -> Dict[str, Any]:
        return {"c0": self.c0.to_list(), "c1": self.c1.to_list(), "scale": float(self.scale)}

    @staticmethod
    def from_dict(data: Dict[str, Any], context: CKKSContext) -> 'CKKSCiphertext':
        if "c0" not in data or "c1" not in data:
            raise ValueError("Invalid ciphertext format")
        c0 = Polynomial.from_list(data["c0"], context.q)
        c1 = Polynomial.from_list(data["c1"], context.q)
        scale = data.get("scale", context.scale)
        return CKKSCiphertext(c0, c1, context, scale)

class CKKSEngine:
    def __init__(self, context: CKKSContext):
        self.context = context

    def encode(self, value: float) -> Polynomial:
        scaled_value = int(round(value * self.context.scale))
        return Polynomial([scaled_value], self.context.q)

    def decode(self, poly: Polynomial) -> float:
        val = int(poly.coeffs[0])
        if val > self.context.q // 2:
            val -= self.context.q
        return val / self.context.scale

    def encrypt(self, value: float, public_key: CKKSPublicKey) -> CKKSCiphertext:
        if public_key.context.n != self.context.n:
            raise ValueError("Public key context mismatch")
        m = self.encode(value)
        u_coeffs = np.random.choice([-1, 0, 1], size=self.context.n)
        u = Polynomial(u_coeffs, self.context.q)
        e1_coeffs = [int(np.random.randint(-2, 3, dtype=np.int64)) for _ in range(self.context.n)]
        e1 = Polynomial(e1_coeffs, self.context.q)
        e2_coeffs = [int(np.random.randint(-2, 3, dtype=np.int64)) for _ in range(self.context.n)]
        e2 = Polynomial(e2_coeffs, self.context.q)
        bu = (public_key.b * u).mod_poly(self.context.n)
        c0 = (bu + e1 + m).mod_poly(self.context.n)
        au = (public_key.a * u).mod_poly(self.context.n)
        c1 = (au + e2).mod_poly(self.context.n)
        return CKKSCiphertext(c0, c1, self.context, self.context.scale)

    def decrypt(self, ciphertext: CKKSCiphertext, secret_key: CKKSSecretKey) -> float:
        if ciphertext.context.n != secret_key.context.n:
            raise ValueError("Context mismatch")
        c1s = (ciphertext.c1 * secret_key.poly).mod_poly(self.context.n)
        m_poly = (ciphertext.c0 + c1s).mod_poly(self.context.n)
        return self.decode(m_poly)
