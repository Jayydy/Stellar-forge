#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{
    token::StellarAssetClient,
    testutils::Address as _,
    Address, Env,
};

#[derive(Arbitrary, Debug, Clone)]
struct FuzzFeeArithmeticInput {
    base_fee: i128,
    metadata_fee: i128,
    num_operations: u8,
}

fuzz_target!(|input: FuzzFeeArithmeticInput| {
    let _env = Env::default();
    
    // Test basic arithmetic operations that might overflow
    let base_fee = input.base_fee.saturating_abs();
    let metadata_fee = input.metadata_fee.saturating_abs();
    
    // These should not panic even with extreme values
    let _total_fee = base_fee.saturating_add(metadata_fee);
    let _scaled_fee = base_fee.saturating_mul(i128::from(input.num_operations));
    let _multiplied = metadata_fee.saturating_mul(10);
    
    // Verify saturating arithmetic works correctly
    assert!(base_fee >= 0);
    assert!(metadata_fee >= 0);
    assert!(_total_fee >= base_fee);
    assert!(_total_fee >= metadata_fee);
    
    // Test fee calculation patterns used in token factory
    let operations = input.num_operations.min(100) as i128;
    let cumulative_fees = base_fee.saturating_mul(operations);
    
    // Verify monotonic increase property
    assert!(cumulative_fees >= 0);
    assert!(cumulative_fees >= base_fee || base_fee == 0);
});

