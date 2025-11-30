import numpy as np
import random
from typing import Dict, Any
from .polynomial import Polynomial

class BFVContext:
    def __init__(self, poly_degree: int = 1024, plain_modulus: int = 65537, coeff_modulus: int = 2**60):
        if poly_degree <= 0 or (poly_degree & (poly_degree - 1)) != 0:
            raise ValueError("Polynomial degree must be a power of 2")
        if plain_modulus <= 1:
            raise ValueError("Plain modulus must be greater than 1")
        if coeff_modulus <= plain_modulus:
            raise ValueError("Coefficient modulus must exceed plain modulus")
        self.n = poly_degree
        self.t = plain_modulus
        self.q = coeff_modulus
        self.delta = self.q // self.t

class SecretKey:
    def __init__(self, context: BFVContext):
        coeffs = np.random.choice([-1, 0, 1], size=context.n)
        self.poly = Polynomial(coeffs, context.q)
        self.context = context

class PublicKey:
    def __init__(self, context: BFVContext, secret_key: SecretKey):
        if context.n != secret_key.context.n:
            raise ValueError("Context mismatch between public and secret key")
        self.context = context
        a_coeffs = [random.randint(0, context.q - 1) for _ in range(context.n)]
        self.a = Polynomial(a_coeffs, context.q)
        e_coeffs = [random.randint(-3, 3) for _ in range(context.n)]
        self.e = Polynomial(e_coeffs, context.q)
        as_poly = self.a * secret_key.poly
        as_poly = as_poly.mod_poly(context.n)
        neg_as_coeffs = (-as_poly.coeffs) % context.q
        neg_as = Polynomial(neg_as_coeffs, context.q)
        self.b = (neg_as + self.e).mod_poly(context.n)

class Ciphertext:
    def __init__(self, c0: Polynomial, c1: Polynomial, context: BFVContext):
        if c0.modulus != context.q or c1.modulus != context.q:
            raise ValueError("Ciphertext modulus mismatch")
        self.c0 = c0
        self.c1 = c1
        self.context = context

    def __add__(self, other: 'Ciphertext') -> 'Ciphertext':
        if not isinstance(other, Ciphertext):
            raise TypeError("Can only add Ciphertext objects")
        if self.context.q != other.context.q:
            raise ValueError("Ciphertext contexts must match")
        new_c0 = (self.c0 + other.c0).mod_poly(self.context.n)
        new_c1 = (self.c1 + other.c1).mod_poly(self.context.n)
        return Ciphertext(new_c0, new_c1, self.context)

    def to_dict(self) -> Dict[str, Any]:
        return {"c0": self.c0.to_list(), "c1": self.c1.to_list()}

    @staticmethod
    def from_dict(data: Dict[str, Any], context: BFVContext) -> 'Ciphertext':
        if "c0" not in data or "c1" not in data:
            raise ValueError("Invalid ciphertext data format")
        c0 = Polynomial.from_list(data["c0"], context.q)
        c1 = Polynomial.from_list(data["c1"], context.q)
        return Ciphertext(c0, c1, context)

class BFVEngine:
    def __init__(self, context: BFVContext):
        self.context = context

    def encode(self, value: int) -> Polynomial:
        if value < 0 or value >= self.context.t:
            raise ValueError(f"Value must be in range [0, {self.context.t})")
        scaled = (value * self.context.delta) % self.context.q
        return Polynomial([scaled], self.context.q)

    def decode(self, poly: Polynomial) -> int:
        val = int(poly.coeffs[0])
        if val > self.context.q // 2:
            val -= self.context.q
        decoded = round(val / self.context.delta) % self.context.t
        return int(decoded)

    def encrypt(self, value: int, public_key: PublicKey) -> Ciphertext:
        if public_key.context.n != self.context.n:
            raise ValueError("Public key context mismatch")
        m = self.encode(value)
        u_coeffs = np.random.choice([-1, 0, 1], size=self.context.n)
        u = Polynomial(u_coeffs, self.context.q)
        e1_coeffs = [random.randint(-2, 2) for _ in range(self.context.n)]
        e1 = Polynomial(e1_coeffs, self.context.q)
        e2_coeffs = [random.randint(-2, 2) for _ in range(self.context.n)]
        e2 = Polynomial(e2_coeffs, self.context.q)
        bu = (public_key.b * u).mod_poly(self.context.n)
        c0 = (bu + e1 + m).mod_poly(self.context.n)
        au = (public_key.a * u).mod_poly(self.context.n)
        c1 = (au + e2).mod_poly(self.context.n)
        return Ciphertext(c0, c1, self.context)

    def decrypt(self, ciphertext: Ciphertext, secret_key: SecretKey) -> int:
        if ciphertext.context.n != secret_key.context.n:
            raise ValueError("Ciphertext and key context mismatch")
        c1s = (ciphertext.c1 * secret_key.poly).mod_poly(self.context.n)
        m_poly = (ciphertext.c0 + c1s).mod_poly(self.context.n)
        return self.decode(m_poly)
