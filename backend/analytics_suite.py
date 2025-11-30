from typing import List, Tuple, Optional
from fhe_core.ckks import CKKSContext, CKKSCiphertext, CKKSPublicKey, CKKSEngine

SUPPORTED_METRICS = {
    "total_volume": "Sum of all swap amounts",
    "avg_transaction": "Average swap size",
    "swap_volume": "Total swap activity",
    "bridge_net_flow": "ZEC flowing to other chains",
    "avg_exchange_rate": "Average ZEC exchange rate",
    "swap_fees": "Total swap fees collected",
    "slippage_realized": "Price slippage during swaps",
    "swap_success_rate": "Percentage of successful swaps",
    "tx_velocity": "Swaps per time period",
    "moving_avg": "Rolling average of swap volumes"
}

class FHEAnalytics:
    def __init__(self, context: CKKSContext, public_key: CKKSPublicKey):
        self.context = context
        self.public_key = public_key
        self.engine = CKKSEngine(context)
    
    def sum(self, ciphertexts: List[CKKSCiphertext]) -> Optional[CKKSCiphertext]:
        if not ciphertexts:
            return None
        result = ciphertexts[0]
        for ct in ciphertexts[1:]:
            result = result + ct
        return result
    
    def mean(self, ciphertexts: List[CKKSCiphertext]) -> Tuple[Optional[CKKSCiphertext], int]:
        if not ciphertexts:
            return None, 0
        total = self.sum(ciphertexts)
        return total, len(ciphertexts)
    
    def moving_average(self, ciphertexts: List[CKKSCiphertext], window: int) -> Tuple[Optional[CKKSCiphertext], int]:
        if not ciphertexts or window <= 0:
            return None, 0
        window_size = min(window, len(ciphertexts))
        window_cts = ciphertexts[-window_size:]
        total = self.sum(window_cts)
        return total, window_size
    
    def swap_volume_by_destination(self, swap_data: List[dict]) -> dict:
        results = {}
        for chain in set(s['destination_asset'] for s in swap_data if 'destination_asset' in s):
            chain_swaps = [s for s in swap_data if s.get('destination_asset') == chain]
            chain_cts = [s['encrypted_amount'] for s in chain_swaps]
            if chain_cts:
                results[chain] = self.sum(chain_cts)
        return results
