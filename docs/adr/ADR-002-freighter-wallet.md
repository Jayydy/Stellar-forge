# ADR-002: Freighter Wallet Integration

**Status:** Accepted

## Context

The frontend needs a way for users to sign Stellar transactions from the browser without exposing private keys to the app. Several Stellar wallet options exist: Freighter (browser extension), Albedo (web-based), and WalletConnect adapters.

## Decision

Integrate **Freighter** via the official `@stellar/freighter-api` npm package as the primary wallet.

## Consequences

**Positive**
- Freighter is the most widely used Stellar browser wallet; users in the target market are likely to already have it installed.
- The `@stellar/freighter-api` package provides a typed, promise-based API that fits naturally into a React/TypeScript codebase.
- Freighter handles key management and transaction signing entirely client-side — the app never touches private keys.
- The "Install Freighter" prompt in the UI gives a clear onboarding path for new users.

**Negative**
- Users without the extension must install it before they can interact with the app.
- Mobile browser support is limited (Freighter is primarily a desktop extension).
- Adding support for additional wallets (e.g., Albedo) would require abstracting the wallet interface — deferred to a future iteration.
