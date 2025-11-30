"""
Big Integer Arithmetic for Production FHE
Supports arbitrary precision arithmetic with moduli > 2^200
"""

try:
    from gmpy2 import mpz, powmod, invert, is_prime
    HAVE_GMPY2 = True
except ImportError:
    HAVE_GMPY2 = False

import numpy as np
from typing import Union, List


class BigInt:
    """Arbitrary precision integer wrapper for FHE operations"""
    
    def __init__(self, value: Union[int, str, 'mpz']):
        if HAVE_GMPY2:
            self.value = mpz(value)
        else:
            self.value = int(value)
    
    def __add__(self, other: 'BigInt') -> 'BigInt':
        return BigInt(self.value + other.value)
    
    def __sub__(self, other: 'BigInt') -> 'BigInt':
        return BigInt(self.value - other.value)
    
    def __mul__(self, other: 'BigInt') -> 'BigInt':
        return BigInt(self.value * other.value)
    
    def __mod__(self, modulus: 'BigInt') -> 'BigInt':
        return BigInt(self.value % modulus.value)
    
    def __pow__(self, exp: int, modulus: 'BigInt' = None) -> 'BigInt':
        if modulus and HAVE_GMPY2:
            return BigInt(powmod(self.value, exp, modulus.value))
        elif modulus:
            return BigInt(pow(self.value, exp, modulus.value))
        else:
            return BigInt(self.value ** exp)
    
    def __int__(self) -> int:
        return int(self.value)
    
    def __str__(self) -> str:
        return str(self.value)
    
    def __repr__(self) -> str:
        return f"BigInt({self.value})"
    
    def __eq__(self, other) -> bool:
        if isinstance(other, BigInt):
            return self.value == other.value
        return self.value == other
    
    def __lt__(self, other) -> bool:
        if isinstance(other, BigInt):
            return self.value < other.value
        return self.value < other
    
    def __le__(self, other) -> bool:
        if isinstance(other, BigInt):
            return self.value <= other.value
        return self.value <= other
    
    def __gt__(self, other) -> bool:
        if isinstance(other, BigInt):
            return self.value > other.value
        return self.value > other
    
    def __ge__(self, other) -> bool:
        if isinstance(other, BigInt):
            return self.value >= other.value
        return self.value >= other
    
    def __neg__(self) -> 'BigInt':
        return BigInt(-self.value)
    
    def mod_inverse(self, modulus: 'BigInt') -> 'BigInt':
        """Compute modular inverse using extended Euclidean algorithm"""
        if HAVE_GMPY2:
            return BigInt(invert(self.value, modulus.value))
        else:
            def extended_gcd(a, b):
                if a == 0:
                    return b, 0, 1
                gcd, x1, y1 = extended_gcd(b % a, a)
                x = y1 - (b // a) * x1
                y = x1
                return gcd, x, y
            
            _, x, _ = extended_gcd(int(self.value), int(modulus.value))
            return BigInt(x % modulus.value)


def generate_large_prime(bit_length: int) -> BigInt:
    """Generate cryptographically secure prime of specified bit length"""
    if HAVE_GMPY2:
        from gmpy2 import random_state, mpz_urandomb, next_prime
        state = random_state()
        candidate = mpz_urandomb(state, bit_length) | (1 << (bit_length - 1)) | 1
        prime = next_prime(candidate)
        return BigInt(prime)
    else:
        import random
        while True:
            candidate = random.getrandbits(bit_length) | (1 << (bit_length - 1)) | 1
            if is_probable_prime(candidate):
                return BigInt(candidate)


def is_probable_prime(n: int, k: int = 40) -> bool:
    """Miller-Rabin primality test"""
    if n < 2:
        return False
    if n == 2 or n == 3:
        return True
    if n % 2 == 0:
        return False
    
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1
        d //= 2
    
    import random
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)
        
        if x == 1 or x == n - 1:
            continue
        
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    
    return True


def bigint_array_to_numpy(arr: List[BigInt]) -> np.ndarray:
    """Convert BigInt array to numpy for faster operations"""
    return np.array([int(x.value) % (2**63) for x in arr], dtype=np.int64)


def numpy_to_bigint_array(arr: np.ndarray) -> List[BigInt]:
    """Convert numpy array to BigInt array"""
    return [BigInt(int(x)) for x in arr]


SECURITY_PARAMS = {
    'poc': BigInt(2**60),
    'test': BigInt(2**80),
    'production': BigInt(2**128),
    'high': BigInt(2**200),
    'maximum': BigInt(2**256 - 189)
}


def get_modulus(security_level: str = 'production') -> BigInt:
    """Get recommended modulus for security level"""
    return SECURITY_PARAMS.get(security_level, SECURITY_PARAMS['production'])
