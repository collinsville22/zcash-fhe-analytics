mod encryption;
mod error;
mod keys;
mod types;
mod proof;

pub use encryption::*;
pub use error::*;
pub use keys::*;
pub use types::*;
pub use proof::*;

#[cfg(target_os = "android")]
mod android;

#[cfg(target_os = "android")]
pub use android::*;

uniffi::setup_scaffolding!();
