use crate::error::{FHEError, Result};
use crate::types::ChainConfig;
use once_cell::sync::OnceCell;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use tfhe::CompactPublicKey;
use tfhe::zk::CompactPkeCrs;

static KEY_CACHE: OnceCell<RwLock<KeyCache>> = OnceCell::new();

struct KeyCache {
    public_keys: HashMap<u64, Arc<CompactPublicKey>>,
    crs_cache: HashMap<u64, Arc<CompactPkeCrs>>,
}

impl KeyCache {
    fn new() -> Self {
        Self {
            public_keys: HashMap::new(),
            crs_cache: HashMap::new(),
        }
    }
}

fn get_cache() -> &'static RwLock<KeyCache> {
    KEY_CACHE.get_or_init(|| RwLock::new(KeyCache::new()))
}

pub fn deserialize_public_key(key_hex: &str) -> Result<Arc<CompactPublicKey>> {
    let key_bytes = hex::decode(key_hex.trim_start_matches("0x"))?;

    let key: CompactPublicKey = bincode::deserialize(&key_bytes).map_err(|e| {
        FHEError::KeyDeserializationFailed {
            message: format!("{}", e),
        }
    })?;

    Ok(Arc::new(key))
}

pub fn deserialize_crs(crs_hex: &str) -> Result<Arc<CompactPkeCrs>> {
    let crs_bytes = hex::decode(crs_hex.trim_start_matches("0x"))?;

    let crs: CompactPkeCrs = bincode::deserialize(&crs_bytes).map_err(|e| {
        FHEError::CrsDeserializationFailed {
            message: format!("{}", e),
        }
    })?;

    Ok(Arc::new(crs))
}

pub fn cache_public_key(chain_id: u64, key: Arc<CompactPublicKey>) {
    let mut cache = get_cache().write();
    cache.public_keys.insert(chain_id, key);
}

pub fn cache_crs(chain_id: u64, crs: Arc<CompactPkeCrs>) {
    let mut cache = get_cache().write();
    cache.crs_cache.insert(chain_id, crs);
}

pub fn get_cached_public_key(chain_id: u64) -> Option<Arc<CompactPublicKey>> {
    let cache = get_cache().read();
    cache.public_keys.get(&chain_id).cloned()
}

pub fn get_cached_crs(chain_id: u64) -> Option<Arc<CompactPkeCrs>> {
    let cache = get_cache().read();
    cache.crs_cache.get(&chain_id).cloned()
}

pub fn clear_cache() {
    let mut cache = get_cache().write();
    cache.public_keys.clear();
    cache.crs_cache.clear();
}

#[uniffi::export]
pub fn load_keys_from_hex(chain_id: u64, public_key_hex: String, crs_hex: String) -> Result<()> {
    let public_key = deserialize_public_key(&public_key_hex)?;
    let crs = deserialize_crs(&crs_hex)?;

    cache_public_key(chain_id, public_key);
    cache_crs(chain_id, crs);

    Ok(())
}

#[uniffi::export]
pub fn is_initialized(chain_id: u64) -> bool {
    get_cached_public_key(chain_id).is_some() && get_cached_crs(chain_id).is_some()
}
