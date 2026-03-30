# ADR-003: Pinata for IPFS Metadata Storage

**Status:** Accepted

## Context

Token metadata (name, description, image) must be stored off-chain in a content-addressed, decentralised way so that the on-chain URI remains stable even if a centralised server goes down. Options considered: self-hosted IPFS node, Infura IPFS, NFT.Storage, and Pinata.

## Decision

Use **Pinata** as the IPFS pinning service, accessed via its REST API with an API key/secret stored in environment variables.

## Consequences

**Positive**
- Pinata provides a simple REST API (`/pinning/pinFileToIPFS`, `/pinning/pinJSONToIPFS`) that requires no IPFS daemon on the client.
- Files pinned to Pinata are accessible via the public `gateway.pinata.cloud` gateway, which is already allow-listed in the CSP.
- The free tier is sufficient for development and small-scale production use.
- Switching to another pinning service only requires changing the `ipfs.ts` service layer.

**Negative**
- Pinata is a centralised pinning service; if it goes offline, new uploads fail (existing CIDs remain accessible via other gateways).
- API keys must be kept secret and rotated if compromised — they are stored in `.env` and never committed.
- The free tier has upload size and request limits that may require a paid plan at scale.
