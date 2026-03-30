# Requirements Document

## Introduction

The `token-factory` Soroban smart contract currently imports `soroban-token-sdk` and uses its `TokenClient` to perform cross-contract mint and burn calls. This is incorrect: `soroban-token-sdk` is a helper library for *building* token contracts, not for *calling* external token contracts. The correct approach for cross-contract token calls in Soroban is to use `token::Client` (and `token::StellarAssetClient`) from `soroban-sdk`. This spec covers auditing all incorrect usages, replacing them with the correct client, removing the now-unnecessary dependency, and verifying the contract compiles and its tests pass.

## Glossary

- **TokenFactory**: The Soroban smart contract defined in `contracts/token-factory/src/lib.rs`.
- **soroban-token-sdk**: A third-party helper crate for *implementing* SEP-41 token contracts. It is not intended for cross-contract calls.
- **soroban-sdk**: The official Soroban SDK. Provides `token::Client` and `token::StellarAssetClient` for cross-contract token interactions.
- **token::Client**: The cross-contract client for SEP-41 token contracts, available from `soroban-sdk`.
- **TokenClient**: The incorrectly-used client imported from `soroban-token-sdk` in the current codebase.
- **Cross-contract call**: A call from one Soroban contract to a function on another deployed contract.

## Requirements

### Requirement 1: Audit soroban-token-sdk Usage

**User Story:** As a smart contract developer, I want all usages of `soroban-token-sdk`'s `TokenClient` identified, so that I know the full scope of incorrect cross-contract call patterns in the codebase.

#### Acceptance Criteria

1. THE TokenFactory contract source (`lib.rs`) SHALL be audited to identify every import and usage of `TokenClient` from `soroban-token-sdk`.
2. THE audit SHALL identify the `mint_tokens` function as using `TokenClient::new(&env, &token_address).mint(...)` incorrectly.
3. THE audit SHALL identify the `burn` function as using `TokenClient::new(&env, &token_address).burn(...)` incorrectly.

---

### Requirement 2: Replace TokenClient with token::Client

**User Story:** As a smart contract developer, I want all cross-contract mint and burn calls to use `token::Client` from `soroban-sdk`, so that the contract correctly interacts with external token contracts.

#### Acceptance Criteria

1. WHEN `mint_tokens` performs a cross-contract mint call, THE TokenFactory SHALL use `token::Client::new(&env, &token_address).mint(...)` from `soroban-sdk`.
2. WHEN `burn` performs a cross-contract burn call, THE TokenFactory SHALL use `token::Client::new(&env, &token_address).burn(...)` from `soroban-sdk`.
3. THE TokenFactory source (`lib.rs`) SHALL NOT contain any import of `TokenClient` from `soroban-token-sdk` after the replacement.
4. THE TokenFactory source (`lib.rs`) SHALL NOT contain any usage of `soroban_token_sdk` after the replacement.

---

### Requirement 3: Remove soroban-token-sdk Dependency

**User Story:** As a smart contract developer, I want the `soroban-token-sdk` crate removed from the project's dependencies if it is no longer needed, so that the dependency tree is clean and does not include unused or incorrect libraries.

#### Acceptance Criteria

1. WHEN `soroban-token-sdk` is no longer referenced in any source file, THE `contracts/token-factory/Cargo.toml` SHALL NOT list `soroban-token-sdk` under `[dependencies]`.
2. WHEN `soroban-token-sdk` is no longer referenced in any source file, THE `contracts/token-factory/Cargo.toml` SHALL NOT list `soroban-token-sdk` under `[dev-dependencies]`.
3. WHEN `soroban-token-sdk` is no longer referenced in any source file, THE `contracts/token-factory/Cargo.toml` SHALL NOT reference `soroban-token-sdk` in the `[features]` section.
4. IF any other contract or workspace member still requires `soroban-token-sdk`, THEN THE dependency SHALL be retained only in those members' manifests.

---

### Requirement 4: Contract Compiles Successfully

**User Story:** As a smart contract developer, I want the contract to compile without errors after the changes, so that I can be confident the replacement is syntactically and semantically correct.

#### Acceptance Criteria

1. WHEN `cargo build` is run against `contracts/token-factory`, THE Rust compiler SHALL produce no errors.
2. WHEN `cargo build` is run against `contracts/token-factory`, THE Rust compiler SHALL produce no unresolved import warnings related to `soroban_token_sdk`.

---

### Requirement 5: All Tests Pass

**User Story:** As a smart contract developer, I want all existing tests to continue passing after the changes, so that I can be confident the behavioral contract of the TokenFactory is preserved.

#### Acceptance Criteria

1. WHEN `cargo test` is run against `contracts/token-factory`, THE test suite SHALL report zero test failures.
2. THE existing tests in `test.rs` SHALL NOT require modification to accommodate the `token::Client` replacement, unless the test setup itself was relying on `soroban-token-sdk` test utilities.
3. IF test utilities from `soroban-token-sdk` were used in `test.rs`, THEN THE TokenFactory test suite SHALL replace them with equivalent utilities from `soroban-sdk`.
