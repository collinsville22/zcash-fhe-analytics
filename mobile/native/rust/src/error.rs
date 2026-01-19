use thiserror::Error;

#[derive(Error, Debug, uniffi::Error)]
pub enum FHEError {
    #[error("Failed to deserialize public key: {message}")]
    KeyDeserializationFailed { message: String },

    #[error("Failed to deserialize CRS: {message}")]
    CrsDeserializationFailed { message: String },

    #[error("Encryption failed: {message}")]
    EncryptionFailed { message: String },

    #[error("Proof generation failed: {message}")]
    ProofGenerationFailed { message: String },

    #[error("Invalid input: {message}")]
    InvalidInput { message: String },

    #[error("Serialization failed: {message}")]
    SerializationFailed { message: String },

    #[error("Network request failed: {message}")]
    NetworkFailed { message: String },

    #[error("Not initialized")]
    NotInitialized,
}

impl From<tfhe::Error> for FHEError {
    fn from(err: tfhe::Error) -> Self {
        FHEError::EncryptionFailed {
            message: err.to_string(),
        }
    }
}

impl From<serde_json::Error> for FHEError {
    fn from(err: serde_json::Error) -> Self {
        FHEError::SerializationFailed {
            message: err.to_string(),
        }
    }
}

impl From<hex::FromHexError> for FHEError {
    fn from(err: hex::FromHexError) -> Self {
        FHEError::InvalidInput {
            message: err.to_string(),
        }
    }
}

pub type Result<T> = std::result::Result<T, FHEError>;
