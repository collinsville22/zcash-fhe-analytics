import numpy as np
from .polynomial import Polynomial
from .ckks import CKKSContext, CKKSSecretKey

class RelinearizationKey:
    """
    Relinearization key for reducing ciphertext from 3 components to 2.
    Generated from s^2 where s is the secret key.
    """
    def __init__(self, context: CKKSContext, secret_key: CKKSSecretKey):
        if context.n != secret_key.context.n:
            raise ValueError("Context mismatch")
        self.context = context
        
        s_squared = (secret_key.poly * secret_key.poly).mod_poly(context.n)
        
        a_coeffs = [int(np.random.randint(0, min(context.q, 2**31 - 1), dtype=np.int64)) for _ in range(context.n)]
        self.a = Polynomial(a_coeffs, context.q)
        
        e_coeffs = [int(np.random.randint(-3, 4, dtype=np.int64)) for _ in range(context.n)]
        self.e = Polynomial(e_coeffs, context.q)
        
        as_poly = (self.a * secret_key.poly).mod_poly(context.n)
        neg_as_coeffs = (-as_poly.coeffs) % context.q
        neg_as = Polynomial(neg_as_coeffs, context.q)
        
        self.rlk0 = (neg_as + self.e + s_squared).mod_poly(context.n)
        self.rlk1 = self.a
