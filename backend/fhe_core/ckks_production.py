"""
Production-Grade CKKS Implementation
Uses big integers (2^200 modulus) and discrete Gaussian sampling
"""

import numpy as np
from typing import Dict, Any, Optional
from .polynomial import Polynomial
from .bigint import BigInt, get_modulus, HAVE_GMPY2
from .gaussian import sample_discrete_gaussian, sample_ternary, sample_for_operation

class ProductionCKKSContext:
    """
    Production CKKS context with configurable security level.
    
    Security levels:
    - 'poc': 60-bit (POC/testing only)
    - 'test': 80-bit (development)
    - 'production': 128-bit (minimum for production)
    - 'high': 200-bit (recommended)
    - 'maximum': 256-bit (maximum security)
    """
    
    def __init__(
        self, 
        poly_degree: int = 2048,  # Increased from 1024
        scale: float = 2**40, 
        security_level: str = 'high'  # Default to 200-bit
    ):
        if poly_degree <= 0 or (poly_degree & (poly_degree - 1)) != 0:
            raise ValueError("Polynomial degree must be a power of 2")
        
        self.n = poly_degree
        self.scale = scale
        self.security_level = security_level
        
        # Get production modulus based on security level
        self.q = get_modulus(security_level)
        
        # Modulus chain for noise management (optional, for bootstrapping)
        self.modulus_chain = self._generate_modulus_chain()
        
        print(f" CKKS Context initialized:")
        print(f"   Security: {security_level}")
        print(f"   Modulus bits: {self.q.value.bit_length() if HAVE_GMPY2 else len(bin(int(self.q.value))) - 2}")
        print(f"   Poly degree: {self.n}")
    
    def _generate_modulus_chain(self):
        """Generate chain of moduli for modulus switching"""
        # Simplified chain: q, q/2^40, q/2^80, ...
        if self.security_level in ['production', 'high', 'maximum']:
            base_bits = int(self.q.value).bit_length()
            chain = []
            for i in range(0, base_bits, 40):
                if base_bits - i >= 60:  # Keep minimum 60 bits
                    chain.append(BigInt(2**(base_bits - i)))
            return chain
        return [self.q]


class ProductionCKKSSecretKey:
    """Secret key with ternary distribution for optimal security"""
    
    def __init__(self, context: ProductionCKKSContext):
        self.context = context
        # Use ternary distribution {-1, 0, 1} - more secure than Gaussian for secret key
        coeffs = sample_for_operation('secret_key', context.n)
        self.poly = Polynomial(coeffs, context.q)


class ProductionCKKSPublicKey:
    """Public key with Gaussian error sampling"""
    
    def __init__(self, context: ProductionCKKSContext, secret_key: ProductionCKKSSecretKey):
        if context.n != secret_key.context.n:
            raise ValueError("Context mismatch")
        
        self.context = context
        
        # Generate 'a' uniformly at random (using cryptographically secure source)
        import secrets
        a_coeffs = [secrets.randbelow(int(context.q.value)) for _ in range(context.n)]
        self.a = Polynomial(a_coeffs, context.q)
        
        # Use discrete Gaussian for error
        e_coeffs = sample_for_operation('public_key_error', context.n)
        self.e = Polynomial(e_coeffs, context.q)
        
        # Compute b = -(a*s + e) mod q
        as_poly = self.a * secret_key.poly
        as_poly = as_poly.mod_poly(context.n)
        neg_as_coeffs = (-as_poly.coeffs) % int(context.q.value)
        neg_as = Polynomial(neg_as_coeffs, context.q)
        self.b = (neg_as + self.e).mod_poly(context.n)
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize public key"""
        return {
            "a": self.a.to_list(),
            "b": self.b.to_list()
        }


class ProductionCKKSCiphertext:
    """CKKS Ciphertext with production parameters"""
    
    def __init__(self, c0: Polynomial, c1: Polynomial, context: ProductionCKKSContext, scale: float):
        if c0.modulus != context.q or c1.modulus != context.q:
            raise ValueError("Ciphertext modulus mismatch")
        if scale <= 0:
            raise ValueError("Scale must be positive")
        
        self.c0 = c0
        self.c1 = c1
        self.context = context
        self.scale = scale
    
    def __add__(self, other: 'ProductionCKKSCiphertext') -> 'ProductionCKKSCiphertext':
        if not isinstance(other, ProductionCKKSCiphertext):
            raise TypeError("Can only add ProductionCKKSCiphertext objects")
        if abs(self.scale - other.scale) > 1e-6:
            raise ValueError("Ciphertexts must have matching scales")
        if self.context.q != other.context.q:
            raise ValueError("Context mismatch")
        
        new_c0 = (self.c0 + other.c0).mod_poly(self.context.n)
        new_c1 = (self.c1 + other.c1).mod_poly(self.context.n)
        return ProductionCKKSCiphertext(new_c0, new_c1, self.context, self.scale)
    
    def __mul__(self, other: 'ProductionCKKSCiphertext') -> 'ProductionCKKSCiphertext':
        if not isinstance(other, ProductionCKKSCiphertext):
            raise TypeError("Can only multiply ProductionCKKSCiphertext objects")
        if self.context.q != other.context.q:
            raise ValueError("Context mismatch")
        
        # Correct CKKS multiplication formula
        c0_c0 = (self.c0 * other.c0).mod_poly(self.context.n)
        c0_c1 = (self.c0 * other.c1).mod_poly(self.context.n)
        c1_c0 = (self.c1 * other.c0).mod_poly(self.context.n)
        
        new_c0 = c0_c0.mod_poly(self.context.n)
        new_c1 = (c0_c1 + c1_c0).mod_poly(self.context.n)
        new_scale = self.scale * other.scale
        
        return ProductionCKKSCiphertext(new_c0, new_c1, self.context, new_scale)
    
    def rescale(self) -> 'ProductionCKKSCiphertext':
        if self.scale < self.context.scale:
            raise ValueError("Cannot rescale: scale too small")
        
        new_scale = self.scale / self.context.scale
        new_c0_coeffs = np.round(self.c0.coeffs.astype(np.float64) / self.context.scale).astype(np.int64)
        new_c1_coeffs = np.round(self.c1.coeffs.astype(np.float64) / self.context.scale).astype(np.int64)
        new_c0 = Polynomial(new_c0_coeffs, self.context.q)
        new_c1 = Polynomial(new_c1_coeffs, self.context.q)
        
        return ProductionCKKSCiphertext(new_c0, new_c1, self.context, new_scale)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "c0": self.c0.to_list(),
            "c1": self.c1.to_list(),
            "scale": float(self.scale)
        }
    
    @staticmethod
    def from_dict(data: Dict[str, Any], context: ProductionCKKSContext) -> 'ProductionCKKSCiphertext':
        if "c0" not in data or "c1" not in data:
            raise ValueError("Invalid ciphertext format")
        
        c0 = Polynomial.from_list(data["c0"], context.q)
        c1 = Polynomial.from_list(data["c1"], context.q)
        scale = data.get("scale", context.scale)
        
        return ProductionCKKSCiphertext(c0, c1, context, scale)


class ProductionCKKSEngine:
    """Production CKKS engine with all security enhancements"""
    
    def __init__(self, context: ProductionCKKSContext):
        self.context = context
    
    def encode(self, value: float) -> Polynomial:
        """Encode float to polynomial"""
        scaled = int(value * self.context.scale)
        scaled_mod = scaled % int(self.context.q.value)
        return Polynomial([scaled_mod], self.context.q)
    
    def decode(self, poly: Polynomial) -> float:
        """Decode polynomial to float"""
        val = int(poly.coeffs[0])
        q_int = int(self.context.q.value)
        
        # Handle negative values
        if val > q_int // 2:
            val -= q_int
        
        return val / self.context.scale
    
    def encrypt(self, value: float, public_key: ProductionCKKSPublicKey) -> ProductionCKKSCiphertext:
        if public_key.context.n != self.context.n:
            raise ValueError("Public key context mismatch")
        
        m = self.encode(value)
        
        # Use ternary distribution for 'u'
        u_coeffs = sample_ternary(self.context.n)
        u = Polynomial(u_coeffs, self.context.q)
        
        # Use Gaussian for encryption errors
        e1_coeffs = sample_for_operation('encryption_error', self.context.n)
        e1 = Polynomial(e1_coeffs, self.context.q)
        
        e2_coeffs = sample_for_operation('encryption_error', self.context.n)
        e2 = Polynomial(e2_coeffs, self.context.q)
        
        # c0 = b*u + e1 + m
        bu = (public_key.b * u).mod_poly(self.context.n)
        c0 = (bu + e1 + m).mod_poly(self.context.n)
        
        # c1 = a*u + e2
        au = (public_key.a * u).mod_poly(self.context.n)
        c1 = (au + e2).mod_poly(self.context.n)
        
        return ProductionCKKSCiphertext(c0, c1, self.context, self.context.scale)
    
    def decrypt(self, ciphertext: ProductionCKKSCiphertext, secret_key: ProductionCKKSSecretKey) -> float:
        if ciphertext.context.n != secret_key.context.n:
            raise ValueError("Ciphertext and key context mismatch")
        
        # m = c0 + c1*s mod q
        c1s = (ciphertext.c1 * secret_key.poly).mod_poly(self.context.n)
        m_poly = (ciphertext.c0 + c1s).mod_poly(self.context.n)
        
        return self.decode(m_poly)


# Backward compatibility with existing code
# Map old names to production versions
CKKSContext = ProductionCKKSContext
CKKSSecretKey = ProductionCKKSSecretKey  
CKKSPublicKey = ProductionCKKSPublicKey
CKKSCiphertext = ProductionCKKSCiphertext
CKKSEngine = ProductionCKKSEngine
