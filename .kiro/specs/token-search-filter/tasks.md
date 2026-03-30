# Implementation Plan: Token Search, Filter, and Sort

## Overview

Refactor `Dashboard` to accept a `tokens` prop and derive a filtered/sorted list entirely in memory. Extract a pure `applyFilters` function, add a `FilterBar` UI, and wire everything together with `useMemo` and `useDebounce`.

## Tasks

- [x] 1. Add `SortOrder` type to `frontend/src/types/index.ts`
  - Add `export type SortOrder = 'newest' | 'oldest' | 'alphabetical'` to the types file
  - _Requirements: 3.1_

- [ ] 2. Extract and implement the `applyFilters` pure function
  - [x] 2.1 Create `frontend/src/utils/tokenFilters.ts` exporting `applyFilters(tokens: TokenInfo[], search: string, creator: string, sort: SortOrder): TokenInfo[]`
    - Implement case-insensitive name/symbol substring filter
    - Implement case-insensitive creator substring filter
    - Implement sort: `newest` (identity), `oldest` (reverse), `alphabetical` (`localeCompare`)
    - Treat `undefined`/`null` tokens prop as empty array
    - _Requirements: 1.3, 1.4, 2.3, 2.4, 2.5, 3.3, 3.4, 3.5, 5.1_

  - [ ]* 2.2 Write property test — Property 1: search filter correctness
    - In `frontend/src/test/Dashboard.test.tsx`, use `fast-check` to assert every result token matches the search query (name or symbol, case-insensitive)
    - **Property 1: Search filter correctness**
    - **Validates: Requirements 1.3**

  - [ ]* 2.3 Write property test — Property 2: creator filter correctness
    - Assert every result token's `creator` contains the filter string (case-insensitive)
    - **Property 2: Creator filter correctness**
    - **Validates: Requirements 2.3**

  - [ ]* 2.4 Write property test — Property 3: combined filter conjunction
    - Assert every result token satisfies both search and creator conditions simultaneously
    - **Property 3: Combined filter conjunction**
    - **Validates: Requirements 2.5**

  - [ ]* 2.5 Write property test — Property 5: newest/oldest are inverses
    - Assert `applyFilters(tokens, '', '', 'oldest')` equals `[...applyFilters(tokens, '', '', 'newest')].reverse()`
    - **Property 5: Newest-first and oldest-first are inverses**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 2.6 Write property test — Property 6: alphabetical sort ordering invariant
    - Assert every adjacent pair `(a, b)` in the alphabetical result satisfies `a.name.localeCompare(b.name) <= 0`
    - **Property 6: Alphabetical sort ordering invariant**
    - **Validates: Requirements 3.5**

  - [ ]* 2.7 Write property test — Property 7: clearing filters restores full list
    - Assert `applyFilters(tokens, '', '', 'newest')` deep-equals the original `tokens` array
    - **Property 7: Clearing filters restores full list**
    - **Validates: Requirements 1.4, 2.4, 4.4**

- [x] 3. Checkpoint — Ensure all `applyFilters` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Refactor `Dashboard` component
  - [x] 4.1 Update `Dashboard` props to `{ tokens?: TokenInfo[] }` and remove the `useEffect`/RPC call
    - Import `SortOrder` from `types/index.ts` and `applyFilters` from `utils/tokenFilters.ts`
    - Add `useState` for `searchQuery`, `creatorFilter` (both `string`), and `sortOrder` (`SortOrder`, default `'newest'`)
    - Derive `debouncedSearch` and `debouncedCreator` via `useDebounce(..., 300)`
    - Compute `filteredTokens` with `useMemo(() => applyFilters(tokens ?? [], debouncedSearch, debouncedCreator, sortOrder), [tokens, debouncedSearch, debouncedCreator, sortOrder])`
    - _Requirements: 1.2, 1.5, 2.2, 3.2, 5.1_

  - [x] 4.2 Add `FilterBar` inline JSX inside `Dashboard`
    - Render `<Input label="Search by name or symbol" />` bound to `searchQuery`
    - Render `<Input label="Filter by creator address" />` bound to `creatorFilter`
    - Render a `<select>` with options `newest` / `oldest` / `alphabetical` bound to `sortOrder`
    - _Requirements: 1.1, 2.1, 3.1, 3.2_

  - [x] 4.3 Add token list rendering and `EmptyState` logic
    - When `filteredTokens` is empty and any filter is active → render `"No tokens match your search."`
    - When `filteredTokens` is empty and no filter is active → render `"No tokens have been deployed yet."`
    - Otherwise render the token list (map `filteredTokens` to token cards)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Write unit tests for `Dashboard` rendering
  - [ ]* 5.1 Write unit tests in `frontend/src/test/Dashboard.test.tsx`
    - Render with empty `tokens` → assert "No tokens have been deployed yet."
    - Render with tokens, simulate search that matches nothing → assert "No tokens match your search."
    - Render with tokens, simulate search that matches some → assert only matching tokens visible
    - Assert sort select defaults to "Newest first"
    - Assert all three sort options are present
    - Assert search and creator inputs have correct labels
    - Assert no RPC call is made when filter state changes (spy on `stellarService`)
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 4.1, 4.2, 5.1_

- [ ] 6. Wire `Dashboard` into the parent (`App.tsx`)
  - [x] 6.1 Update `App.tsx` (or the relevant parent component) to pass a `tokens` prop to `Dashboard`
    - Load the token list at the parent level and pass it down as `tokens`
    - _Requirements: 5.1_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `applyFilters` is the primary unit under test for property-based tests — no component rendering needed for those iterations
- Property 4 (debounce timing) and Property 8 (no RPC calls) are covered by unit tests rather than property-based tests
- `fast-check` must be available: `npm install --save-dev fast-check` if not already installed
