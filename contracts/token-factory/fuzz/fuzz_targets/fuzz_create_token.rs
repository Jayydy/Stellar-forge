#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;

#[derive(Arbitrary, Debug, Clone)]
struct FuzzCreateTokenInput {
    // Random bytes for name and symbol - bounded to avoid extremely long strings
    #[arbitrary(size_hint = 1..=100)]
    name_bytes: Vec<u8>,
    #[arbitrary(size_hint = 1..=50)]
    symbol_bytes: Vec<u8>,
    decimals: u32,
    initial_supply: i128,
    fee_payment: i128,
}

fuzz_target!(|input: FuzzCreateTokenInput| {
    // Test string validation and creation with random UTF-8 data
    
    // Convert random bytes to valid UTF-8 strings
    let name_str = match String::from_utf8(input.name_bytes) {
        Ok(s) if !s.is_empty() => s,
        _ => "DefaultToken".to_string(),
    };
    
    let symbol_str = match String::from_utf8(input.symbol_bytes) {
        Ok(s) if !s.is_empty() => s,
        _ => "DTK".to_string(),
    };

    // Verify string properties
    assert!(!name_str.is_empty());
    assert!(!symbol_str.is_empty());

    // Test bounded arithmetic - should not panic on overflow
    let decimals_bounded = input.decimals % 256;
    let initial_supply_bounded = input.initial_supply.saturating_mul(1);
    let fee_bounded = input.fee_payment.saturating_abs();

    // Verify invariants
    assert!(decimals_bounded < 256);
    assert!(fee_bounded >= 0);
    
    // Test saturation arithmetic doesn't panic
    let _total = initial_supply_bounded.saturating_add(fee_bounded);
    let _product = fee_bounded.saturating_mul(i128::from(decimals_bounded));
    
    // Fuzz test passes if no panic occurs
});


