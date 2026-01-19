use crate::error::{FHEError, Result};
use crate::keys::{get_cached_crs, get_cached_public_key};
use crate::proof::{build_zk_metadata, compute_ct_hash, serialize_proof};
use crate::types::{EncryptedInput, EncryptedSwapPayload, EncryptedTransactionPayload, FheUintType};
use std::sync::Arc;
use tfhe::prelude::*;
use tfhe::zk::{CompactPkeCrs, ZkComputeLoad};
use tfhe::{
    set_server_key, CompactCiphertextList, CompactCiphertextListBuilder, CompactPublicKey,
    ProvenCompactCiphertextList,
};

struct EncryptionContext {
    public_key: Arc<CompactPublicKey>,
    crs: Arc<CompactPkeCrs>,
    account: String,
    security_zone: u32,
    chain_id: u64,
}

impl EncryptionContext {
    fn new(
        chain_id: u64,
        account: String,
        security_zone: u32,
    ) -> Result<Self> {
        let public_key = get_cached_public_key(chain_id).ok_or(FHEError::NotInitialized)?;
        let crs = get_cached_crs(chain_id).ok_or(FHEError::NotInitialized)?;

        Ok(Self {
            public_key,
            crs,
            account,
            security_zone,
            chain_id,
        })
    }

    fn encrypt_u64(&self, value: u64) -> Result<(Vec<u8>, String)> {
        let metadata = build_zk_metadata(&self.account, self.security_zone, self.chain_id)?;

        let mut builder = ProvenCompactCiphertextList::builder(&self.public_key);
        builder.push(value);

        let proven_list = builder
            .build_with_proof_packed(&self.crs, &metadata, ZkComputeLoad::Proof)
            .map_err(|e: tfhe::Error| FHEError::ProofGenerationFailed {
                message: format!("{}", e),
            })?;

        let proof_data = bincode::serialize(&proven_list).map_err(|e| FHEError::SerializationFailed {
            message: format!("{}", e),
        })?;

        let ct_hash = compute_ct_hash(&proof_data, 0);

        Ok((proof_data, ct_hash))
    }

    fn encrypt_u128(&self, value: u128) -> Result<(Vec<u8>, String)> {
        let metadata = build_zk_metadata(&self.account, self.security_zone, self.chain_id)?;

        let mut builder = ProvenCompactCiphertextList::builder(&self.public_key);
        builder.push(value);

        let proven_list = builder
            .build_with_proof_packed(&self.crs, &metadata, ZkComputeLoad::Proof)
            .map_err(|e: tfhe::Error| FHEError::ProofGenerationFailed {
                message: format!("{}", e),
            })?;

        let proof_data = bincode::serialize(&proven_list).map_err(|e| FHEError::SerializationFailed {
            message: format!("{}", e),
        })?;

        let ct_hash = compute_ct_hash(&proof_data, 0);

        Ok((proof_data, ct_hash))
    }

    fn encrypt_multiple_u64(&self, values: &[u64]) -> Result<(Vec<u8>, Vec<String>)> {
        let metadata = build_zk_metadata(&self.account, self.security_zone, self.chain_id)?;

        let mut builder = ProvenCompactCiphertextList::builder(&self.public_key);
        for value in values {
            builder.push(*value);
        }

        let proven_list = builder
            .build_with_proof_packed(&self.crs, &metadata, ZkComputeLoad::Proof)
            .map_err(|e: tfhe::Error| FHEError::ProofGenerationFailed {
                message: format!("{}", e),
            })?;

        let proof_data = bincode::serialize(&proven_list).map_err(|e| FHEError::SerializationFailed {
            message: format!("{}", e),
        })?;

        let ct_hashes: Vec<String> = values
            .iter()
            .enumerate()
            .map(|(i, _)| compute_ct_hash(&proof_data, i))
            .collect();

        Ok((proof_data, ct_hashes))
    }
}

#[uniffi::export]
pub fn encrypt_value(
    chain_id: u64,
    account: String,
    value: u64,
    security_zone: u32,
) -> Result<EncryptedInput> {
    let ctx = EncryptionContext::new(chain_id, account, security_zone)?;
    let (proof_data, ct_hash) = ctx.encrypt_u64(value)?;

    Ok(EncryptedInput {
        ct_hash,
        security_zone,
        utype: FheUintType::Uint64.as_u8(),
        signature: String::new(),
        proof_data,
    })
}

#[uniffi::export]
pub fn encrypt_swap(
    chain_id: u64,
    account: String,
    amount_in_zatoshi: u64,
    fee_zatoshi: u64,
    destination_asset: String,
    platform: String,
    security_zone: u32,
) -> Result<EncryptedSwapPayload> {
    let ctx = EncryptionContext::new(chain_id, account, security_zone)?;
    let (proof_data, ct_hashes) = ctx.encrypt_multiple_u64(&[amount_in_zatoshi, fee_zatoshi])?;

    let proof_hex = serialize_proof(&proof_data);

    Ok(EncryptedSwapPayload {
        encrypted_amount_in: EncryptedInput {
            ct_hash: ct_hashes[0].clone(),
            security_zone,
            utype: FheUintType::Uint64.as_u8(),
            signature: String::new(),
            proof_data: proof_data.clone(),
        },
        encrypted_fee: EncryptedInput {
            ct_hash: ct_hashes[1].clone(),
            security_zone,
            utype: FheUintType::Uint64.as_u8(),
            signature: String::new(),
            proof_data,
        },
        destination_asset,
        platform,
    })
}

#[uniffi::export]
pub fn encrypt_transaction(
    chain_id: u64,
    account: String,
    amount_zatoshi: u64,
    fee_zatoshi: u64,
    transaction_type: String,
    pool_type: String,
    platform: String,
    security_zone: u32,
) -> Result<EncryptedTransactionPayload> {
    let ctx = EncryptionContext::new(chain_id, account, security_zone)?;
    let (proof_data, ct_hashes) = ctx.encrypt_multiple_u64(&[amount_zatoshi, fee_zatoshi])?;

    Ok(EncryptedTransactionPayload {
        encrypted_amount: EncryptedInput {
            ct_hash: ct_hashes[0].clone(),
            security_zone,
            utype: FheUintType::Uint64.as_u8(),
            signature: String::new(),
            proof_data: proof_data.clone(),
        },
        encrypted_fee: EncryptedInput {
            ct_hash: ct_hashes[1].clone(),
            security_zone,
            utype: FheUintType::Uint64.as_u8(),
            signature: String::new(),
            proof_data,
        },
        transaction_type,
        pool_type,
        platform,
    })
}

#[uniffi::export]
pub fn zec_to_zatoshi(zec: f64) -> u64 {
    (zec * 100_000_000.0) as u64
}

#[uniffi::export]
pub fn zatoshi_to_zec(zatoshi: u64) -> f64 {
    zatoshi as f64 / 100_000_000.0
}
