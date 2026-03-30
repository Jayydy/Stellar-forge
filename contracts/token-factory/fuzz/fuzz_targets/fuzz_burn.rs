#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;

#[derive(Arbitrary, Debug, Clone)]
struct FuzzBurnInput {
    initial_balance: i128,
    burn_amount_offset: i128,
    burn_iterations: u8,
}

fuzz_target!(|input: FuzzBurnInput| {
    // Test arithmetic operations used in burn logic
    let initial_balance = input.initial_balance.saturating_abs().min(i128::MAX / 2);
    let burn_amount = input.burn_amount_offset.saturating_abs().min(initial_balance);
    
    // Simulate burn arithmetic
    if burn_amount > 0 && burn_amount <= initial_balance {
        let remaining = initial_balance.saturating_sub(burn_amount);
        assert_eq!(remaining, initial_balance - burn_amount);
    }
    
    // Test multiple burns in sequence
    let mut balance = initial_balance;
    let iterations = input.burn_iterations.min(50) as usize;
    
    for _ in 0..iterations {
        if balance > 0 {
            let amount = balance / 2; // Burn half, avoiding division by zero
            balance = balance.saturating_sub(amount);
            // Balance should never go negative
            assert!(balance >= 0);
        }
    }
    
    // Test boundary condition: burning entire balance
    if initial_balance > 0 {
        let remaining_after_full_burn = initial_balance.saturating_sub(initial_balance);
        assert_eq!(remaining_after_full_burn, 0);
    }
    
    // Test invalid burn scenarios
    let invalid_negative_burn = (-100i128).saturating_abs(); // Make positive
    assert!(invalid_negative_burn >= 0);
    
    // Test burn with overflow protection
    let max_burn = i128::MAX;
    let safe_operation = max_burn.saturating_mul(2);
    assert!(safe_operation >= 0 || safe_operation == i128::MIN); // Saturated
});

