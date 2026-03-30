# Implementation Plan: Invalid Parameters Validation

## Overview

Add input validation to `create_token` in `contracts/token-factory/src/lib.rs`, then cover it with unit tests and property-based tests in `test.rs`. The change is self-contained: no new types, storage keys, or dependencies beyond adding `proptest` to `[dev-dependencies]`.

## Tasks

- [x] 1. Add validation block to `create_token` in `lib.rs`
  - Insert the four guard checks (`name.len() == 0`, `symbol.len() == 0`, `decimals > 18`, `initial_supply < 0`) at the very top of `create_token`, before `Self::require_not_paused` and `creator.require_auth()`
  - Each failing check returns `Err(Error::InvalidParameters)` immediately
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2_

- [x] 2. Add unit tests to `test.rs`
  - [x] 2.1 Write unit test `test_create_token_rejects_empty_name`
    - Call `try_create_token` with `name = ""` and valid other params; assert `Err(Ok(Error::InvalidParameters))`
    - _Requirements: 1.1, 6.1_
  - [x] 2.2 Write unit test `test_create_token_rejects_empty_symbol`
    - Call `try_create_token` with `symbol = ""` and valid other params; assert `Err(Ok(Error::InvalidParameters))`
    - _Requirements: 2.1, 6.2_
  - [x] 2.3 Write unit test `test_create_token_rejects_decimals_19`
    - Call `try_create_token` with `decimals = 19`; assert `Err(Ok(Error::InvalidParameters))`
    - _Requirements: 3.1, 6.3_
  - [x] 2.4 Write unit test `test_create_token_accepts_decimals_18`
    - Call `try_create_token` with `decimals = 18`; assert result ≠ `Err(Ok(Error::InvalidParameters))`
    - _Requirements: 3.2, 6.4_
  - [x] 2.5 Write unit test `test_create_token_rejects_negative_supply`
    - Call `try_create_token` with `initial_supply = -1`; assert `Err(Ok(Error::InvalidParameters))`
    - _Requirements: 4.1, 6.5_

- [x] 3. Checkpoint — Ensure all tests pass
  - Run `cargo test -p token-factory` and confirm all existing and new unit tests pass. Ask the user if questions arise.

- [x] 4. Add `proptest` to dev-dependencies and write property-based tests
  - [x] 4.1 Add `proptest = "1"` to `[dev-dependencies]` in `contracts/token-factory/Cargo.toml` (if not already present)
    - _Requirements: 5.1, 5.2_
  - [ ]* 4.2 Write property test for Property 1: Empty name is always rejected
    - **Property 1: Empty name is always rejected**
    - **Validates: Requirements 1.1**
    - Use `proptest!` with arbitrary valid `symbol` (`[a-zA-Z]{1,12}`), `decimals` (0..=18), `supply` (0..=1_000_000); fix `name = ""`; assert `Err(Ok(Error::InvalidParameters))`
  - [ ]* 4.3 Write property test for Property 2: Empty symbol is always rejected
    - **Property 2: Empty symbol is always rejected**
    - **Validates: Requirements 2.1**
    - Use `proptest!` with arbitrary valid `name`, `decimals`, `supply`; fix `symbol = ""`; assert `Err(Ok(Error::InvalidParameters))`
  - [ ]* 4.4 Write property test for Property 3: Decimals above 18 are always rejected
    - **Property 3: Decimals above 18 are always rejected**
    - **Validates: Requirements 3.1**
    - Use `proptest!` with `decimals in 19u32..=u32::MAX`; assert `Err(Ok(Error::InvalidParameters))`
  - [ ]* 4.5 Write property test for Property 4: Negative initial supply is always rejected
    - **Property 4: Negative initial supply is always rejected**
    - **Validates: Requirements 4.1**
    - Use `proptest!` with `supply in i128::MIN..=-1i128`; assert `Err(Ok(Error::InvalidParameters))`
  - [ ]* 4.6 Write property test for Property 5: All-valid parameters are not rejected by validation
    - **Property 5: All-valid parameters are not rejected by validation**
    - **Validates: Requirements 1.2, 2.2, 3.2, 4.2, 4.3**
    - Use `proptest!` with non-empty `name`, non-empty `symbol`, `decimals in 0..=18`, `supply in 0..=1_000_000`; assert result ≠ `Err(Ok(Error::InvalidParameters))`

- [x] 5. Final checkpoint — Ensure all tests pass
  - Run `cargo test -p token-factory` and confirm the full suite (unit + property) passes. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `proptest = "1"` in `[dev-dependencies]`; note `proptest` is currently listed under `[dependencies]` in `Cargo.toml` — move it to `[dev-dependencies]` as part of task 4.1
- Run tests with: `cargo test -p token-factory`
