# ADR-001: Choice of Stellar / Soroban for Smart Contracts

**Status:** Accepted

## Context

StellarForge needs a smart-contract platform to deploy custom tokens on behalf of users in emerging markets. Key requirements are low transaction fees, fast finality, and a token standard that is already widely supported by wallets and exchanges.

## Decision

Use the **Stellar** blockchain with **Soroban** smart contracts (Rust-based, WASM execution).

## Consequences

**Positive**
- Transaction fees are a fraction of a cent, making the app viable for users with limited funds.
- 3–5 second finality removes the need for complex confirmation UX.
- The SEP-41 token standard is natively supported by Freighter, Lobstr, and Stellar DEX.
- Soroban's deterministic WASM execution and built-in storage model simplify contract design.
- Stellar CLI tooling (`stellar contract deploy/invoke`) covers the full dev-to-production workflow.

**Negative**
- Soroban is newer than EVM; the ecosystem (libraries, auditors, tooling) is smaller.
- Rust has a steeper learning curve than Solidity for new contributors.
- Cross-chain interoperability requires bridges, which are out of scope for v1.
