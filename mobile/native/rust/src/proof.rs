use crate::error::{FHEError, Result};
use sha3::{Digest, Keccak256};

pub fn build_zk_metadata(account: &str, security_zone: u32, chain_id: u64) -> Result<Vec<u8>> {
    let account_bytes = hex::decode(account.trim_start_matches("0x")).map_err(|e| {
        FHEError::InvalidInput {
            message: format!("Invalid account address: {}", e),
        }
    })?;

    if account_bytes.len() != 20 {
        return Err(FHEError::InvalidInput {
            message: "Account address must be 20 bytes".to_string(),
        });
    }

    let mut metadata = Vec::with_capacity(32);
    metadata.extend_from_slice(&account_bytes);
    metadata.extend_from_slice(&security_zone.to_be_bytes());
    metadata.extend_from_slice(&chain_id.to_be_bytes());

    Ok(metadata)
}

pub fn compute_ct_hash(proof_data: &[u8], index: usize) -> String {
    let mut hasher = Keccak256::new();
    hasher.update(proof_data);
    hasher.update(&index.to_be_bytes());
    let result = hasher.finalize();
    format!("0x{}", hex::encode(result))
}

pub fn serialize_proof(proof_data: &[u8]) -> String {
    format!("0x{}", hex::encode(proof_data))
}
