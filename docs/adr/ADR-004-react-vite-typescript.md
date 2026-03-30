# ADR-004: React + Vite + TypeScript for Frontend

**Status:** Accepted

## Context

The frontend needs a modern, maintainable stack that supports fast iteration, type safety, and a good developer experience. Options considered: Next.js (SSR), Create React App (CRA), and Vite + React.

## Decision

Use **React 19** with **Vite** as the build tool and **TypeScript** for type safety, styled with **Tailwind CSS**.

## Consequences

**Positive**
- Vite's native ESM dev server starts in milliseconds and provides near-instant HMR, significantly faster than CRA or webpack.
- TypeScript catches contract/API shape mismatches at compile time, reducing runtime errors when interacting with Soroban.
- React's component model maps cleanly to the app's UI sections (TokenDetail, Dashboard, forms).
- Tailwind CSS eliminates the need for a separate CSS file per component and keeps styling co-located with markup.
- The app is a pure SPA — no server-side rendering is needed, so Next.js overhead is unnecessary.
- Vitest shares Vite's config and transform pipeline, making test setup trivial.

**Negative**
- A pure SPA requires client-side routing; deep links need proper redirect rules on the hosting provider.
- Tailwind's utility-class approach can make JSX verbose; mitigated by extracting reusable UI primitives into `components/UI/`.
- React 19 is relatively new; some third-party libraries may not yet declare peer-dependency support for it.
