# Requirements Document

## Introduction

The FeeDisplay component provides a reusable way to display Stellar contract fees (creation fee and metadata fee) in XLM. The component fetches fee data from the factory contract via `stellarService.getFactoryState()`, converts stroops to XLM, shows a loading skeleton while fetching, and caches the result to avoid redundant RPC calls across multiple instances.

## Glossary

- **FeeDisplay**: The reusable React component that renders a labeled fee amount in XLM.
- **Factory_State**: The on-chain state returned by `stellarService.getFactoryState()`, containing `baseFee` and `metadataFee` in stroops.
- **Stroops**: The smallest unit of XLM; 1 XLM = 10,000,000 stroops.
- **XLM**: The native Stellar currency displayed to the user.
- **Module_Cache**: A module-level variable shared across all FeeDisplay instances that stores the resolved Factory_State to prevent duplicate RPC calls.
- **Stellar_Service**: The service at `frontend/src/services/stellar.ts` that communicates with the Stellar network.

## Requirements

### Requirement 1: Fee Amount Display

**User Story:** As a user, I want to see the fee amount in XLM, so that I can understand the cost without needing to know about stroops.

#### Acceptance Criteria

1. WHEN the Factory_State has been fetched, THE FeeDisplay SHALL display the fee amount converted from stroops to XLM using `stroopsToXLM`.
2. WHEN `feeType` is `'base'`, THE FeeDisplay SHALL display the label `"Creation Fee"` followed by the XLM amount.
3. WHEN `feeType` is `'metadata'`, THE FeeDisplay SHALL display the label `"Metadata Fee"` followed by the XLM amount.
4. THE FeeDisplay SHALL format the displayed value as `"{Label}: {amount} XLM"`.

### Requirement 2: Loading State

**User Story:** As a user, I want to see a loading indicator while the fee is being fetched, so that I know the data is on its way.

#### Acceptance Criteria

1. WHILE the Factory_State fetch is in progress, THE FeeDisplay SHALL render a loading skeleton element.
2. WHILE the Factory_State fetch is in progress, THE FeeDisplay SHALL set `role="status"` and an `aria-label` on the skeleton element for accessibility.
3. WHEN the Factory_State fetch completes, THE FeeDisplay SHALL replace the loading skeleton with the fee amount.

### Requirement 3: Fee Caching

**User Story:** As a developer, I want the fee value to be cached at the module level, so that multiple FeeDisplay instances do not trigger redundant RPC calls.

#### Acceptance Criteria

1. WHEN the Factory_State has been fetched once, THE Module_Cache SHALL store the result and return it immediately for all subsequent calls without issuing a new RPC request.
2. WHEN multiple FeeDisplay instances mount simultaneously before the first fetch completes, THE Module_Cache SHALL deduplicate the in-flight request so that only one RPC call is made.

### Requirement 4: Error Handling

**User Story:** As a user, I want to see a clear message when the fee cannot be loaded, so that I am not left with a broken or empty UI.

#### Acceptance Criteria

1. IF the Factory_State fetch fails, THEN THE FeeDisplay SHALL display `"{Label}: unavailable"` in place of the fee amount.
