# Requirements Document

## Introduction

The Token Metadata Display feature adds a dedicated React component (`TokenMetadata`) that fetches and renders token metadata (image, name, description) from IPFS. When a `metadataUri` is provided the component resolves it through the existing IPFS service and displays the image and description. When no URI is provided, or when the IPFS gateway fails, the component falls back to a placeholder image. The image is lazy-loaded to avoid blocking page render.

## Glossary

- **TokenMetadata**: The React component being built by this feature.
- **IPFS_Service**: The existing singleton `ipfsService` exported from `frontend/src/services/ipfs.ts` that resolves IPFS URIs to metadata objects.
- **IPFS_Gateway**: The HTTP gateway used to convert `ipfs://` URIs into fetchable URLs, configured in `frontend/src/config/ipfs.ts`.
- **Metadata_Object**: A JSON object returned by `IPFS_Service.getMetadata()` that may contain `image`, `name`, and `description` fields.
- **Placeholder**: A static fallback image rendered when no metadata URI is supplied or when fetching/loading fails.
- **metadataUri**: An optional prop of type `string` passed to `TokenMetadata`; expected to be an `ipfs://` URI or any URL resolvable by `IPFS_Service`.

## Requirements

### Requirement 1: Render token image from IPFS metadata

**User Story:** As a user viewing a token, I want to see the token's image fetched from IPFS, so that I can visually identify the token.

#### Acceptance Criteria

1. WHEN `metadataUri` is provided and `IPFS_Service` returns a `Metadata_Object` containing an `image` field, THE `TokenMetadata` SHALL display the resolved image in an `<img>` element with a non-empty `alt` attribute derived from the token `name`.
2. WHEN `metadataUri` is provided and `IPFS_Service` returns a `Metadata_Object` containing a `description` field, THE `TokenMetadata` SHALL display the description as visible text.
3. WHILE `IPFS_Service` is fetching metadata, THE `TokenMetadata` SHALL display a loading indicator using the existing `Spinner` component.
4. THE `TokenMetadata` SHALL always display the token `name` and `symbol` props regardless of whether metadata is available.

### Requirement 2: Show placeholder when no metadata URI is provided

**User Story:** As a user viewing a token without an IPFS URI, I want to see a placeholder image, so that the UI remains consistent and does not show a broken image.

#### Acceptance Criteria

1. WHEN `metadataUri` is `undefined`, THE `TokenMetadata` SHALL render a placeholder image instead of attempting any network request.
2. WHEN `metadataUri` is an empty string, THE `TokenMetadata` SHALL treat it as absent and render the placeholder image.
3. THE placeholder image SHALL have a non-empty `alt` attribute.

### Requirement 3: Handle IPFS gateway errors gracefully

**User Story:** As a user, I want broken or unreachable IPFS links to show a placeholder rather than a broken image icon, so that the UI remains polished even when metadata is unavailable.

#### Acceptance Criteria

1. IF `IPFS_Service.getMetadata()` throws or rejects, THEN THE `TokenMetadata` SHALL render the placeholder image and SHALL NOT display an unhandled error to the user.
2. IF the resolved image URL fails to load (e.g. `<img>` `onError` fires), THEN THE `TokenMetadata` SHALL replace the broken image with the placeholder image.
3. IF `IPFS_Service` returns a `Metadata_Object` that does not contain an `image` field, THEN THE `TokenMetadata` SHALL render the placeholder image.

### Requirement 4: Lazy-load the token image

**User Story:** As a user browsing a page with many tokens, I want images to load lazily, so that the initial page load is not blocked by off-screen token images.

#### Acceptance Criteria

1. WHEN `TokenMetadata` renders a token image (not the placeholder), THE `TokenMetadata` SHALL set the `loading="lazy"` attribute on the `<img>` element.
2. WHEN `TokenMetadata` renders the placeholder image, THE `TokenMetadata` SHALL set the `loading="lazy"` attribute on the placeholder `<img>` element.
