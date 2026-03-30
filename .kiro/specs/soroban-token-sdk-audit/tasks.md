# Implementation Plan: soroban-token-sdk Audit

## Overview

Replace the two incorrect `TokenClient` (from `soroban-token-sdk`) cross-contract calls in `lib.rs` with `token::Client` from `soroban-sdk`, remove the stale dependency from `Cargo.toml`, and verify the contract compiles and tests pass.

## Tasks

- [ ] 1. Remove soroban-token-sdk import and replace TokenClient calls in lib.rs
  - In `contracts/token-factory/src/lib.rs`, delete the line `use soroban_token_sdk::TokenClient;`
  - In `mint_tokens`, replace `TokenClient::new(&env, &token_address).mint(&admin, &to, &amount)` with `token::Client::new(&env, &token_address).mint(&admin, &to, &amount)`
  - In `burn`, replace `TokenClient::new(&env, &token_address).burn(&from, &amount)` with `token::Client::new(&env, &token_address).burn(&from, &amount)`
  - `token` is already in scope via the existing `use soroban_sdk::{..., token}` import — no new import needed
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.1 Verify source is free of soroban-token-sdk references
    - Confirm no occurrence of `soroban_token_sdk` or `TokenClient` remains in `lib.rs`
    - **Property 2: Source is free of soroban-token-sdk references**
    - **Validates: Requirements 2.3, 2.4**

- [ ] 2. Clean up Cargo.toml
  - In `contracts/token-factory/Cargo.toml`, remove `soroban-token-sdk` from `[dependencies]`
  - Remove `soroban-token-sdk` from `[dev-dependencies]`
  - Remove `soroban-token-sdk/testutils` from the `testutils` entry in `[features]`
  - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 2.1 Verify Cargo.toml is clean
    - Confirm `Cargo.toml` contains no remaining `soroban-token-sdk` entries in any section
    - **Property 3: Cargo manifest is clean**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 3. Checkpoint — verify build and tests pass
  - Run `cargo build` in `contracts/token-factory` and confirm it succeeds with no errors
  - Run `cargo test` in `contracts/token-factory` and confirm all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 4.1, 5.1_

  - [ ]* 3.1 Write integration test for cross-contract dispatch
    - Register a mock SEP-41 token contract in the test environment using `soroban-sdk` testutils
    - Call `mint_tokens` and `burn` on the TokenFactory pointing at the mock token
    - Assert the mock token received the correct mint/burn calls with the correct arguments
    - **Property 1: Cross-contract dispatch uses token::Client**
    - **Validates: Requirements 2.1, 2.2**
