are import random

def mod_inverse(a: int, m: int) -> int:
    if m <= 0:
        raise ValueError("Modulus must be positive")
    if a == 0:
        raise ValueError("Cannot compute inverse of zero")
    m0, x0, x1 = m, 0, 1
    while a > 1:
        if m == 0:
            raise ValueError("No modular inverse exists")
        q = a // m
        m, a = a % m, m
        x0, x1 = x1 - q * x0, x0
    return x1 + m0 if x1 < 0 else x1

def mod_exp(base: int, exp: int, mod: int) -> int:
    if mod <= 0:
        raise ValueError("Modulus must be positive")
    if exp < 0:
        raise ValueError("Exponent must be non-negative")
    result = 1
    base = base % mod
    while exp > 0:
        if exp % 2 == 1:
            result = (result * base) % mod
        exp = exp >> 1
        base = (base * base) % mod
    return result

def is_prime(n: int, k: int = 5) -> bool:
    if n < 2:
        return False
    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]:
        if n == p:
            return True
        if n % p == 0:
            return False
    s, d = 0, n - 1
    while d % 2 == 0:
        s, d = s + 1, d // 2
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = mod_exp(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(s - 1):
            x = mod_exp(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True

def generate_prime(bits: int) -> int:
    if bits < 2:
        raise ValueError("Prime size must be at least 2 bits")
    max_attempts = bits * 10
    for _ in range(max_attempts):
        p = random.getrandbits(bits)
        if is_prime(p):
            return p
    raise RuntimeError(f"Failed to generate prime after {max_attempts} attempts")
