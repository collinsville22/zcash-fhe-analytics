fn main() {
    uniffi::generate_scaffolding("src/zcash_fhe_core.udl").unwrap();
}
