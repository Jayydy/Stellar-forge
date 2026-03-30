# Implementation Plan: Token Metadata Display

## Overview

Implement the `TokenMetadata` React component with IPFS metadata fetching, graceful error handling, placeholder fallback, and lazy image loading. Tests are co-located with the implementation task that introduces each behaviour.

## Tasks

- [x] 1. Add `TokenMetadataResponse` type and extend the IPFS service
  - Add a local `TokenMetadataResponse` interface (`image?`, `name?`, `description?`) inside `TokenMetadata.tsx` (no changes to `types/index.ts` needed).
  - Verify `ipfsService.getMetadata()` signature is compatible; no changes required to `ipfs.ts`.
  - _Requirements: 1.1, 1.2, 3.3_

- [x] 2. Implement the `TokenMetadata` component
  - [x] 2.1 Create `frontend/src/components/TokenMetadata.tsx` with props `metadataUri?`, `name`, `symbol`, `className?`
    - Implement the four-state internal state machine (`idle`, `loading`, `resolved`, `error`).
    - Treat absent or empty-string `metadataUri` as `idle` (no fetch).
    - Call `ipfsService.getMetadata()` in a `useEffect` when `metadataUri` is present; catch all rejections and transition to `error`.
    - Transition to `error` when resolved object has no `image` field.
    - Always render `name` and `symbol`.
    - Render `<Spinner>` while `loading`.
    - Render token `<img loading="lazy">` when `resolved`; attach `onError` handler that transitions to `error`.
    - Render placeholder `<img data-testid="placeholder-image" loading="lazy" alt="...">` in `idle` and `error` states.
    - Log errors to `console.error`; do not surface error text to the user.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2_

  - [ ]* 2.2 Write unit tests for `TokenMetadata` in `frontend/src/components/TokenMetadata.test.tsx`
    - Example: spinner is visible while fetch is pending (never-resolving promise mock).
    - Example: firing `onError` on the token image swaps it for the placeholder.
    - Edge case: `metadataUri=""` renders placeholder without calling `ipfsService`.
    - _Requirements: 1.3, 2.2, 3.2_

  - [ ]* 2.3 Write property-based tests for `TokenMetadata` using fast-check
    - **Property 1: Image rendered from metadata** — generate random URIs + image URLs; assert rendered `<img src>` matches resolved image value. `// Feature: token-metadata-display, Property 1: image rendered from metadata`
    - **Property 2: Description rendered from metadata** — generate random description strings; assert text appears in DOM. `// Feature: token-metadata-display, Property 2: description rendered from metadata`
    - **Property 3: Name and symbol always present** — generate random name/symbol pairs across all fetch states; assert both strings appear in output. `// Feature: token-metadata-display, Property 3: name and symbol always present`
    - **Property 4: Placeholder on missing or failed metadata** — generate all failure inputs (undefined, empty string, rejection, object without image); assert `data-testid="placeholder-image"` is present with non-empty alt. `// Feature: token-metadata-display, Property 4: placeholder on missing or failed metadata`
    - **Property 5: All images are lazy-loaded** — across all render states assert every `<img>` has `loading="lazy"`. `// Feature: token-metadata-display, Property 5: all images are lazy-loaded`
    - Each property runs minimum 100 iterations.
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 3.1, 3.3, 4.1, 4.2_

- [x] 3. Checkpoint — Ensure all tests pass
  - Run `vitest --run` and confirm zero failures. Ask the user if any questions arise.

- [x] 4. Export and integrate the component
  - [x] 4.1 Re-export `TokenMetadata` from `frontend/src/components/index.ts` (or create the barrel file if it does not exist)
    - _Requirements: 1.1, 1.4_

  - [x] 4.2 Wire `TokenMetadata` into any existing token display page or card that already has `name`, `symbol`, and optional `metadataUri` available
    - Identify the relevant parent component (e.g. a token list item or token detail view).
    - Pass `name`, `symbol`, and `metadataUri` props.
    - _Requirements: 1.1, 1.4_

- [x] 5. Final checkpoint — Ensure all tests pass
  - Run `vitest --run` and confirm zero failures. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Property tests validate universal correctness; unit tests cover concrete examples and edge cases.
