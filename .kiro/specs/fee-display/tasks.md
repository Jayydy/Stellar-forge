# Implementation Plan: FeeDisplay Component

## Overview

Implement the `FeeDisplay` reusable component that fetches factory fees once, caches the result at module level, converts stroops to XLM, and renders a labeled fee string with a loading skeleton and error fallback.

## Tasks

- [x] 1. Create the FeeDisplay component
  - [x] 1.1 Implement module-level cache (`cachedFactoryState`, `pendingRequest`, `getFactoryState`)
    - Write the three-state cache logic: resolved, in-flight, and cold-start
    - _Requirements: 3.1, 3.2_
  - [x] 1.2 Implement component render states (loading skeleton, loaded, error)
    - Use `useState` for `xlm` and `error`; use `useEffect` with cancellation flag
    - Apply Tailwind classes for skeleton animation (`animate-pulse`)
    - Add `role="status"` and `aria-label` to skeleton span
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 4.1_
  - [x]* 1.3 Write unit tests for FeeDisplay
    - Test loading skeleton ARIA attributes (Requirement 2.2)
    - Test `feeType='base'` renders "Creation Fee: 7 XLM" (Requirement 1.2)
    - Test `feeType='metadata'` renders "Metadata Fee: 1 XLM" (Requirement 1.3)
    - Test concurrent mounts share one in-flight request (Requirement 3.2)
    - _Requirements: 1.2, 1.3, 2.2, 3.2_
  - [x]* 1.4 Write property test — Property 1: Stroops-to-XLM conversion is always applied
    - **Property 1: Stroops-to-XLM conversion is always applied**
    - **Validates: Requirements 1.1, 2.3**
    - Generate random non-negative integer stroops; assert rendered text contains `stroopsToXLM(stroops)`
    - Tag: `Feature: fee-display, Property 1`
  - [x]* 1.5 Write property test — Property 2: Output format is always "{Label}: {amount} XLM"
    - **Property 2: Output format is always "{Label}: {amount} XLM"**
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - Generate random stroops + random feeType; assert rendered text matches `"{Label}: {xlm} XLM"`
    - Tag: `Feature: fee-display, Property 2`
  - [x]* 1.6 Write property test — Property 3: Cache prevents duplicate RPC calls
    - **Property 3: Cache prevents duplicate RPC calls**
    - **Validates: Requirements 3.1**
    - Generate N in range 1–20; call `getFactoryState()` N times after first resolution; assert spy called exactly once
    - Tag: `Feature: fee-display, Property 3`
  - [x]* 1.7 Write property test — Property 4: Error state renders unavailable message for all feeTypes
    - **Property 4: Error state renders unavailable message for all feeTypes**
    - **Validates: Requirements 4.1**
    - Generate random feeType; mock service to reject; assert rendered text is `"{Label}: unavailable"`
    - Tag: `Feature: fee-display, Property 4`

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The module-level cache is intentionally outside the component to survive re-renders and be shared across instances
- `stroopsToXLM` is the single source of truth for conversion; do not inline the division
- Property tests use fast-check and run a minimum of 100 iterations each
