# Requirements Document

## Introduction

The `TokenFactory` smart contract exposes a `create_token` entry point that accepts several parameters (name, symbol, decimals, initial_supply). Currently the `Error::InvalidParameters` variant is defined but never used, meaning callers can pass nonsensical values (empty strings, decimals above the ERC-20 maximum of 18) without receiving a meaningful error. This feature adds input validation to `create_token` so that every invalid parameter is caught early and returns `Error::InvalidParameters`, eliminating the dead-code warning and improving contract safety.

## Glossary

- **TokenFactory**: The Soroban smart contract defined in `contracts/token-factory/src/lib.rs` that deploys and manages tokens.
- **create_token**: The public entry point on `TokenFactory` that deploys a new token contract.
- **Error::InvalidParameters**: The existing error variant (discriminant 3) returned when caller-supplied parameters fail validation.
- **decimals**: The number of decimal places for a token, capped at 18 to match the ERC-20 / SEP-0041 convention.
- **initial_supply**: The number of tokens minted to the creator at deployment time; must be non-negative.

## Requirements

### Requirement 1: Validate Token Name

**User Story:** As a contract caller, I want `create_token` to reject an empty token name, so that every deployed token has a human-readable identifier.

#### Acceptance Criteria

1. WHEN `create_token` is called with an empty `name` string, THE `TokenFactory` SHALL return `Error::InvalidParameters` without deploying a token.
2. WHEN `create_token` is called with a non-empty `name` string, THE `TokenFactory` SHALL proceed with the remaining validation steps.

---

### Requirement 2: Validate Token Symbol

**User Story:** As a contract caller, I want `create_token` to reject an empty token symbol, so that every deployed token has a valid ticker.

#### Acceptance Criteria

1. WHEN `create_token` is called with an empty `symbol` string, THE `TokenFactory` SHALL return `Error::InvalidParameters` without deploying a token.
2. WHEN `create_token` is called with a non-empty `symbol` string, THE `TokenFactory` SHALL proceed with the remaining validation steps.

---

### Requirement 3: Validate Decimals

**User Story:** As a contract caller, I want `create_token` to reject a `decimals` value greater than 18, so that deployed tokens conform to the ERC-20 / SEP-0041 standard.

#### Acceptance Criteria

1. WHEN `create_token` is called with `decimals` greater than 18, THE `TokenFactory` SHALL return `Error::InvalidParameters` without deploying a token.
2. WHEN `create_token` is called with `decimals` less than or equal to 18, THE `TokenFactory` SHALL proceed with the remaining validation steps.

---

### Requirement 4: Validate Initial Supply

**User Story:** As a contract caller, I want `create_token` to reject a negative `initial_supply`, so that token accounting starts from a valid non-negative state.

#### Acceptance Criteria

1. WHEN `create_token` is called with `initial_supply` less than 0, THE `TokenFactory` SHALL return `Error::InvalidParameters` without deploying a token.
2. WHEN `create_token` is called with `initial_supply` equal to 0, THE `TokenFactory` SHALL proceed with the remaining validation steps.
3. WHEN `create_token` is called with `initial_supply` greater than 0, THE `TokenFactory` SHALL proceed with the remaining validation steps.

---

### Requirement 5: Eliminate Dead Code Warning for InvalidParameters

**User Story:** As a developer, I want `Error::InvalidParameters` to be actively used in `create_token` validation, so that the compiler no longer reports it as dead code.

#### Acceptance Criteria

1. THE `TokenFactory` SHALL use `Error::InvalidParameters` in at least one reachable code path within `create_token`.
2. WHEN the Rust compiler builds the contract, THE compiler SHALL NOT emit a dead-code warning for the `InvalidParameters` variant.

---

### Requirement 6: Test Coverage for Each Invalid Parameter

**User Story:** As a developer, I want a dedicated test for each invalid parameter case, so that regressions are caught automatically.

#### Acceptance Criteria

1. THE test suite SHALL contain a test that verifies an empty `name` causes `create_token` to return `Err(Ok(Error::InvalidParameters))`.
2. THE test suite SHALL contain a test that verifies an empty `symbol` causes `create_token` to return `Err(Ok(Error::InvalidParameters))`.
3. THE test suite SHALL contain a test that verifies `decimals` equal to 19 causes `create_token` to return `Err(Ok(Error::InvalidParameters))`.
4. THE test suite SHALL contain a test that verifies `decimals` equal to 18 does NOT cause `create_token` to return `Err(Ok(Error::InvalidParameters))`.
5. THE test suite SHALL contain a test that verifies a negative `initial_supply` causes `create_token` to return `Err(Ok(Error::InvalidParameters))`.
