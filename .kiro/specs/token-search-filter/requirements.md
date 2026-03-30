# Requirements Document

## Introduction

As the number of deployed tokens grows on the dashboard, users need the ability to search, filter, and sort the token list without triggering additional RPC calls. This feature adds a search input (filtering by name or symbol), a creator address filter, and sort options (newest first, oldest first, alphabetical) to the TokenDashboard component. All filtering and sorting is performed client-side against the already-loaded token list.

## Glossary

- **Dashboard**: The `Dashboard` React component that displays the list of deployed tokens.
- **Token**: A deployed Stellar token represented by a `TokenInfo` object with `name`, `symbol`, `decimals`, `totalSupply`, and `creator` fields.
- **Token_List**: The full, unfiltered collection of `Token` objects loaded into the Dashboard.
- **Filtered_List**: The subset of the Token_List that matches the current search query, creator filter, and sort order.
- **Search_Query**: The string entered by the user in the search input, matched against token name and symbol.
- **Creator_Filter**: The string entered by the user to match against a token's `creator` address field.
- **Sort_Order**: The user-selected ordering applied to the Filtered_List — one of `newest`, `oldest`, or `alphabetical`.
- **Empty_State**: The UI element displayed when the Filtered_List contains zero tokens.
- **Debounce**: A technique that delays processing input until the user has stopped typing for a defined interval (300 ms).

## Requirements

### Requirement 1: Real-Time Search by Name or Symbol

**User Story:** As a dashboard user, I want to search tokens by name or symbol, so that I can quickly locate a specific token as the list grows.

#### Acceptance Criteria

1. THE Dashboard SHALL render a text input labeled "Search by name or symbol" above the token list.
2. WHEN the user types in the search input, THE Dashboard SHALL update the Filtered_List within 300 ms using a Debounce mechanism.
3. WHILE a Search_Query is active, THE Dashboard SHALL include in the Filtered_List only Tokens whose `name` or `symbol` contains the Search_Query as a case-insensitive substring.
4. WHEN the Search_Query is empty, THE Dashboard SHALL display the full Token_List (subject to any active Creator_Filter and Sort_Order).
5. THE Dashboard SHALL perform all search filtering client-side against the Token_List without making additional RPC calls.

### Requirement 2: Filter by Creator Address

**User Story:** As a dashboard user, I want to filter tokens by creator address, so that I can view only the tokens deployed by a specific account.

#### Acceptance Criteria

1. THE Dashboard SHALL render a text input labeled "Filter by creator address" above the token list.
2. WHEN the user types in the creator address input, THE Dashboard SHALL update the Filtered_List within 300 ms using a Debounce mechanism.
3. WHILE a Creator_Filter is active, THE Dashboard SHALL include in the Filtered_List only Tokens whose `creator` field contains the Creator_Filter as a case-insensitive substring.
4. WHEN the Creator_Filter is empty, THE Dashboard SHALL not restrict the Filtered_List based on creator address.
5. THE Dashboard SHALL apply the Creator_Filter and the Search_Query simultaneously, so that only Tokens matching both criteria appear in the Filtered_List.

### Requirement 3: Sort Options

**User Story:** As a dashboard user, I want to sort the token list by different criteria, so that I can browse tokens in the order most useful to me.

#### Acceptance Criteria

1. THE Dashboard SHALL render a sort control offering three options: "Newest first", "Oldest first", and "Alphabetical".
2. THE Dashboard SHALL default the Sort_Order to "Newest first" on initial render.
3. WHEN the user selects "Newest first", THE Dashboard SHALL order the Filtered_List so that the most recently deployed Token appears first.
4. WHEN the user selects "Oldest first", THE Dashboard SHALL order the Filtered_List so that the earliest deployed Token appears first.
5. WHEN the user selects "Alphabetical", THE Dashboard SHALL order the Filtered_List by token `name` in ascending lexicographic order.
6. THE Dashboard SHALL apply the Sort_Order after all active filters, so that sorting operates on the Filtered_List.

### Requirement 4: Empty State

**User Story:** As a dashboard user, I want to see a clear message when no tokens match my search or filter, so that I know the list is empty due to my criteria and not a loading error.

#### Acceptance Criteria

1. WHEN the Filtered_List contains zero Tokens and at least one filter or search criterion is active, THE Dashboard SHALL display an Empty_State message reading "No tokens match your search."
2. WHEN the Filtered_List contains zero Tokens and no filter or search criterion is active, THE Dashboard SHALL display a distinct message reading "No tokens have been deployed yet."
3. WHILE the Empty_State is displayed, THE Dashboard SHALL not render any token list items.
4. WHEN the user clears all active filters and the Search_Query, THE Dashboard SHALL hide the Empty_State and restore the full token list display.

### Requirement 5: Client-Side Filtering Performance

**User Story:** As a dashboard user, I want filtering and sorting to feel instant, so that the experience remains responsive even with a large token list.

#### Acceptance Criteria

1. THE Dashboard SHALL derive the Filtered_List exclusively from the in-memory Token_List without issuing new network or RPC requests when the Search_Query, Creator_Filter, or Sort_Order changes.
2. WHEN the Token_List contains up to 500 Tokens, THE Dashboard SHALL recompute and render the Filtered_List within 100 ms of a filter or sort change.
