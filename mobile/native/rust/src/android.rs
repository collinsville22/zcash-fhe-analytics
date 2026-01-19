use jni::objects::{JClass, JString};
use jni::sys::{jbyteArray, jlong, jstring};
use jni::JNIEnv;

use crate::encryption::{encrypt_swap, encrypt_transaction, encrypt_value};
use crate::keys::load_keys_from_hex;

fn jstring_to_string(env: &mut JNIEnv, s: JString) -> String {
    env.get_string(&s)
        .map(|s| s.into())
        .unwrap_or_default()
}

fn string_to_jstring(env: &mut JNIEnv, s: &str) -> jstring {
    env.new_string(s)
        .map(|s| s.into_raw())
        .unwrap_or(std::ptr::null_mut())
}

fn result_to_json<T: serde::Serialize>(result: Result<T, crate::error::FHEError>) -> String {
    match result {
        Ok(data) => serde_json::json!({
            "success": true,
            "data": data
        }).to_string(),
        Err(e) => serde_json::json!({
            "success": false,
            "error": e.to_string()
        }).to_string(),
    }
}

#[no_mangle]
pub extern "system" fn Java_co_electriccoin_zcash_fhe_FHECore_loadKeys(
    mut env: JNIEnv,
    _class: JClass,
    chain_id: jlong,
    public_key_hex: JString,
    crs_hex: JString,
) -> jstring {
    let pk = jstring_to_string(&mut env, public_key_hex);
    let crs = jstring_to_string(&mut env, crs_hex);

    let result = load_keys_from_hex(chain_id as u64, pk, crs);
    let json = result_to_json(result.map(|_| "Keys loaded successfully"));

    string_to_jstring(&mut env, &json)
}

#[no_mangle]
pub extern "system" fn Java_co_electriccoin_zcash_fhe_FHECore_encryptValue(
    mut env: JNIEnv,
    _class: JClass,
    chain_id: jlong,
    account: JString,
    value: jlong,
    security_zone: jlong,
) -> jstring {
    let account_str = jstring_to_string(&mut env, account);

    let result = encrypt_value(
        chain_id as u64,
        account_str,
        value as u64,
        security_zone as u32,
    );

    let json = result_to_json(result);
    string_to_jstring(&mut env, &json)
}

#[no_mangle]
pub extern "system" fn Java_co_electriccoin_zcash_fhe_FHECore_encryptSwap(
    mut env: JNIEnv,
    _class: JClass,
    chain_id: jlong,
    account: JString,
    amount_in_zatoshi: jlong,
    fee_zatoshi: jlong,
    destination_asset: JString,
    platform: JString,
    security_zone: jlong,
) -> jstring {
    let account_str = jstring_to_string(&mut env, account);
    let dest = jstring_to_string(&mut env, destination_asset);
    let plat = jstring_to_string(&mut env, platform);

    let result = encrypt_swap(
        chain_id as u64,
        account_str,
        amount_in_zatoshi as u64,
        fee_zatoshi as u64,
        dest,
        plat,
        security_zone as u32,
    );

    let json = result_to_json(result);
    string_to_jstring(&mut env, &json)
}

#[no_mangle]
pub extern "system" fn Java_co_electriccoin_zcash_fhe_FHECore_encryptTransaction(
    mut env: JNIEnv,
    _class: JClass,
    chain_id: jlong,
    account: JString,
    amount_zatoshi: jlong,
    fee_zatoshi: jlong,
    transaction_type: JString,
    pool_type: JString,
    platform: JString,
    security_zone: jlong,
) -> jstring {
    let account_str = jstring_to_string(&mut env, account);
    let tx_type = jstring_to_string(&mut env, transaction_type);
    let pool = jstring_to_string(&mut env, pool_type);
    let plat = jstring_to_string(&mut env, platform);

    let result = encrypt_transaction(
        chain_id as u64,
        account_str,
        amount_zatoshi as u64,
        fee_zatoshi as u64,
        tx_type,
        pool,
        plat,
        security_zone as u32,
    );

    let json = result_to_json(result);
    string_to_jstring(&mut env, &json)
}
