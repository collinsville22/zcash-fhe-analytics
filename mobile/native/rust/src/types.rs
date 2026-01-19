use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, uniffi::Record)]
pub struct ChainConfig {
    pub chain_id: u64,
    pub cofhe_url: String,
    pub verifier_url: String,
    pub threshold_network_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct EncryptedInput {
    pub ct_hash: String,
    pub security_zone: u32,
    pub utype: u8,
    pub signature: String,
    pub proof_data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct EncryptedSwapPayload {
    pub encrypted_amount_in: EncryptedInput,
    pub encrypted_fee: EncryptedInput,
    pub destination_asset: String,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct EncryptedTransactionPayload {
    pub encrypted_amount: EncryptedInput,
    pub encrypted_fee: EncryptedInput,
    pub transaction_type: String,
    pub pool_type: String,
    pub platform: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum FheUintType {
    Uint8 = 2,
    Uint16 = 3,
    Uint32 = 4,
    Uint64 = 5,
    Uint128 = 6,
}

impl FheUintType {
    pub fn as_u8(&self) -> u8 {
        match self {
            FheUintType::Uint8 => 2,
            FheUintType::Uint16 => 3,
            FheUintType::Uint32 => 4,
            FheUintType::Uint64 => 5,
            FheUintType::Uint128 => 6,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyRequest {
    pub proof: String,
    pub account: String,
    pub security_zone: u32,
    pub chain_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyResponse {
    pub ct_hash: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeysResponse {
    pub public_key: String,
    pub crs: String,
}
