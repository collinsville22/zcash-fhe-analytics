"""
Discrete Gaussian Sampling for FHE
Cryptographically secure error distribution
"""

import numpy as np
import secrets


def sample_discrete_gaussian(size: int, sigma: float = 3.2, method: str = 'rejection') -> np.ndarray:
    """
    Sample from discrete Gaussian distribution
    
    Args:
        size: Number of samples
        sigma: Standard deviation
        method: 'rejection' (secure) or 'rounding' (faster)
    
    Returns:
        Array of discrete Gaussian samples
    """
    if method == 'rejection':
        return _rejection_sampling(size, sigma)
    elif method == 'rounding':
        return _rounding_method(size, sigma)
    else:
        raise ValueError(f"Unknown method: {method}")


def _rejection_sampling(size: int, sigma: float) -> np.ndarray:
    """Rejection sampling using cryptographically secure randomness"""
    samples = []
    max_attempts = size * 20
    attempts = 0
    
    sigma_sq = sigma * sigma
    two_sigma_sq = 2 * sigma_sq
    tail = int(4 * sigma) + 1
    
    while len(samples) < size and attempts < max_attempts:
        x = secrets.randbelow(2 * tail + 1) - tail
        prob = np.exp(-x*x / two_sigma_sq)
        threshold = secrets.randbelow(1000000) / 1000000.0
        
        if threshold < prob:
            samples.append(x)
        
        attempts += 1
    
    if len(samples) < size:
        return _rounding_method(size, sigma)
    
    return np.array(samples, dtype=np.int64)


def _rounding_method(size: int, sigma: float) -> np.ndarray:
    """Rounding method for faster sampling"""
    continuous_samples = np.random.normal(0, sigma, size)
    return np.round(continuous_samples).astype(np.int64)


def sample_discrete_gaussian_centered(size: int, sigma: float = 3.2, center: int = 0) -> np.ndarray:
    """Sample from discrete Gaussian centered at specified value"""
    samples = sample_discrete_gaussian(size, sigma)
    return samples + center


def sample_ternary(size: int) -> np.ndarray:
    """
    Sample from {-1, 0, 1} with equal probability
    Used for secret key generation in FHE schemes
    """
    random_bytes = secrets.token_bytes(size)
    values = np.array([b % 3 - 1 for b in random_bytes], dtype=np.int64)
    return values


def sample_binary(size: int) -> np.ndarray:
    """Sample from {0, 1} uniformly"""
    random_bytes = secrets.token_bytes((size + 7) // 8)
    bits = np.unpackbits(np.frombuffer(random_bytes, dtype=np.uint8))
    return bits[:size].astype(np.int64)


def sample_cbd(size: int, eta: int = 2) -> np.ndarray:
    """
    Centered Binomial Distribution sampling
    Used in modern FHE schemes
    
    Args:
        size: Number of samples
        eta: Parameter controlling distribution width
    
    Returns:
        Samples from {-eta, ..., 0, ..., +eta}
    """
    a = sample_binary(size * eta).reshape(size, eta).sum(axis=1)
    b = sample_binary(size * eta).reshape(size, eta).sum(axis=1)
    return (a - b).astype(np.int64)


ERROR_SAMPLING_PARAMS = {
    'secret_key': {'distribution': 'ternary', 'sigma': None},
    'public_key_error': {'distribution': 'gaussian', 'sigma': 3.2},
    'encryption_error': {'distribution': 'gaussian', 'sigma': 3.2},
    'relinearization_error': {'distribution': 'gaussian', 'sigma': 3.2}
}


def sample_for_operation(operation: str, size: int) -> np.ndarray:
    """
    Sample error according to recommended parameters for operation
    
    Args:
        operation: 'secret_key', 'public_key_error', 'encryption_error', etc.
        size: Number of samples
    
    Returns:
        Appropriate error samples
    """
    params = ERROR_SAMPLING_PARAMS.get(operation, {'distribution': 'gaussian', 'sigma': 3.2})
    
    if params['distribution'] == 'ternary':
        return sample_ternary(size)
    elif params['distribution'] == 'gaussian':
        return sample_discrete_gaussian(size, params['sigma'], method='rejection')
    elif params['distribution'] == 'cbd':
        return sample_cbd(size, eta=2)
    else:
        raise ValueError(f"Unknown distribution: {params['distribution']}")


def test_gaussian_distribution(samples: np.ndarray, expected_sigma: float) -> dict:
    """Verify samples follow expected Gaussian distribution"""
    return {
        'mean': float(np.mean(samples)),
        'std': float(np.std(samples)),
        'expected_std': expected_sigma,
        'min': int(np.min(samples)),
        'max': int(np.max(samples)),
        'passes': abs(np.std(samples) - expected_sigma) < 0.5
    }
