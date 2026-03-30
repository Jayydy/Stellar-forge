# Requirements Document

## Introduction

This feature adds contract event indexing and transaction history display to the StellarForge token factory frontend. The factory contract emits events (`token_created`, `tokens_minted`, `tokens_burned`, `metadata_set`) via Soroban's event system. Currently, `StellarService` can fetch these events via the Soroban RPC `getEvents` method, but there is no UI to display them as a transaction history. This feature surfaces that data on the token detail page, showing each event as a history entry with type, amount, date, and a link to Stellar Expert explorer. It also wires up the partially-scaffolded `TransactionHistory` component and introduces a `useTransactionHistory` hook to drive it.

## Glossary

- **StellarService**: The frontend service class in `frontend/src/services/stellar.ts` that communicates with the Soroban RPC and Horizon API.
- **TransactionHistory**: The React component in `frontend/src/components/TransactionHistory.tsx` that renders the list of contract events as a table.
- **useTransactionHistory**: A React hook that fetches and manages contract event data for a given token address.
- **TokenDetail**: The React component in `frontend/src/components/TokenDetail.tsx` that renders the token detail page.
- **ContractEvent**: The existing TypeScript type representing a parsed Soroban contract event (`token_created`, `tokens_minted`, `tokens_burned`, `metadata_set`, `fees_updated`).
- **TransactionEntry**: A display-oriented type derived from `ContractEvent`, containing `id`, `type`, `amount`, `date`, `hash`, and `token` fields for rendering.
- **Soroban RPC**: The JSON-RPC endpoint used to query contract events via the `getEvents` method.
- **Horizon API**: The Stellar Horizon REST API, already used by `StellarService.getTransaction()`.
- **NetworkContext**: The existing React context that exposes the active network (`testnet` | `mainnet`).
- **Stellar Expert**: The block explorer at `https://stellar.expert/explorer/{network}/tx/{hash}`.
- **Factory Contract**: The deployed Soroban token factory contract identified by `STELLAR_CONFIG.factoryContractId`.

---

## Requirements

### Requirement 1: Fetch Contract Events for a Token Address

**User Story:** As a user viewing a token detail page, I want to see the transaction history for that token, so that I can understand what operations have been performed on it.

#### Acceptance Criteria

1. WHEN `getContractEvents` is called with the factory contract ID, THE `StellarService` SHALL filter the returned `ContractEvent` list to only those events whose `data.tokenAddress` matches the requested token address.
2. THE `StellarService` SHALL expose a `getTokenEvents(tokenAddress: string, limit?: number, cursor?: string)` method that returns a `GetEventsResult` containing only events relevant to the given token address.
3. WHEN the Soroban RPC returns no events for the factory contract, THE `StellarService` SHALL return an empty `events` array and a `null` cursor.
4. IF the Soroban RPC call fails, THEN THE `StellarService` SHALL propagate the error so the caller can handle it.
5. THE `StellarService` SHALL support pagination by accepting an optional `cursor` parameter and returning the next cursor in `GetEventsResult`.

---

### Requirement 2: useTransactionHistory Hook

**User Story:** As a developer integrating transaction history into the UI, I want a React hook that manages fetching and pagination of contract events, so that the component stays free of data-fetching logic.

#### Acceptance Criteria

1. THE `useTransactionHistory` hook SHALL accept a `tokenAddress` string and an optional options object with `pageSize` (default 20).
2. WHEN the hook mounts or `tokenAddress` changes, THE `useTransactionHistory` hook SHALL fetch the initial page of `TransactionEntry` items for that token address.
3. THE `useTransactionHistory` hook SHALL expose `{ transactions, loading, error, hasMore, loadMore }` to consumers.
4. WHEN `loadMore` is called and `hasMore` is `true`, THE `useTransactionHistory` hook SHALL append the next page of results to `transactions` without replacing existing entries.
5. WHILE a fetch is in progress, THE `useTransactionHistory` hook SHALL set `loading` to `true`.
6. IF a fetch fails, THEN THE `useTransactionHistory` hook SHALL set `error` to a non-empty string and set `loading` to `false`.
7. WHEN `tokenAddress` is an empty string, THE `useTransactionHistory` hook SHALL return an empty `transactions` array without making a network request.
8. THE `useTransactionHistory` hook SHALL map each `ContractEvent` to a `TransactionEntry` with: `id` from `event.id`, `type` derived from `event.type` (e.g. `token_created` → `create`, `tokens_minted` → `mint`, `tokens_burned` → `burn`, `metadata_set` → `metadata`), `amount` from `event.data.amount` (or `'—'` when absent), `date` as an ISO string derived from `event.timestamp`, `hash` from `event.txHash`, and `token` from `event.data.tokenAddress`.

---

### Requirement 3: TransactionHistory Component

**User Story:** As a user on the token detail page, I want to see a table of transaction history entries, so that I can review past operations at a glance.

#### Acceptance Criteria

1. THE `TransactionHistory` component SHALL accept a `tokenAddress` string prop and use `useTransactionHistory` to load data.
2. WHILE `loading` is `true` and no transactions have been loaded yet, THE `TransactionHistory` component SHALL render a skeleton/loading placeholder.
3. WHEN `transactions` is empty and `loading` is `false` and `error` is absent, THE `TransactionHistory` component SHALL render a localised empty-state message using the `t('transactionHistory.noEvents')` key.
4. WHEN `error` is non-empty, THE `TransactionHistory` component SHALL render the error message in a visible error state.
5. WHEN `transactions` is non-empty, THE `TransactionHistory` component SHALL render a table with columns: Type, Amount, Date, and Transaction Hash.
6. FOR EACH transaction entry, THE `TransactionHistory` component SHALL render the `type` as a colour-coded badge using the existing `badgeColors` map.
7. FOR EACH transaction entry, THE `TransactionHistory` component SHALL render the `date` using the existing `formatTimestamp` utility.
8. FOR EACH transaction entry, THE `TransactionHistory` component SHALL render the `hash` as a link to `https://stellar.expert/explorer/{network}/tx/{hash}` that opens in a new tab, where `{network}` is derived from `NetworkContext`.
9. FOR EACH transaction entry, THE `TransactionHistory` component SHALL render a `CopyButton` next to the transaction hash.
10. WHEN the user scrolls to within 200px of the bottom of the page and `hasMore` is `true`, THE `TransactionHistory` component SHALL call `loadMore` to fetch the next page.
11. THE `TransactionHistory` component SHALL import and use `useTranslation` from `react-i18next` for all user-visible strings.

---

### Requirement 4: Token Detail Page Integration

**User Story:** As a user on the token detail page, I want the transaction history to appear below the token info card, so that I can see all relevant activity in one place.

#### Acceptance Criteria

1. THE `TokenDetail` component SHALL render the `TransactionHistory` component below the existing token info card, passing the current `address` as the `tokenAddress` prop.
2. WHEN `address` is defined and valid, THE `TokenDetail` component SHALL always render the `TransactionHistory` component regardless of whether the connected wallet is the token creator.
3. THE `TokenDetail` component SHALL wrap the `TransactionHistory` component in a `Card` with the title derived from `t('transactionHistory.title')`.

---

### Requirement 5: Explorer Link Correctness

**User Story:** As a user, I want transaction hash links to point to the correct network's Stellar Expert explorer, so that I can verify transactions on the right network.

#### Acceptance Criteria

1. WHEN the active network is `testnet`, THE `TransactionHistory` component SHALL construct explorer URLs using `https://stellar.expert/explorer/testnet/tx/{hash}`.
2. WHEN the active network is `mainnet`, THE `TransactionHistory` component SHALL construct explorer URLs using `https://stellar.expert/explorer/public/tx/{hash}`.
3. THE `TransactionHistory` component SHALL read the active network from `NetworkContext` via the `useNetwork` hook.

---

### Requirement 6: History Refresh After New Transactions

**User Story:** As a user who just minted or burned tokens, I want the transaction history to update automatically, so that I can confirm my action appeared in the list.

#### Acceptance Criteria

1. THE `TokenDetail` component SHALL pass an `onSuccess` callback to `MintForm`, `BurnForm`, and `SetMetadataForm` that triggers a refresh of the `TransactionHistory` component.
2. WHEN a mint, burn, or metadata operation completes successfully, THE `TransactionHistory` component SHALL re-fetch the first page of events from the beginning (resetting pagination state).
3. THE `useTransactionHistory` hook SHALL expose a `refresh` function that resets `transactions`, `cursor`, and `hasMore` to their initial state and re-fetches the first page.
