# Requirements Document

## Introduction

StellarForge currently has no visibility into how users interact with the application. This feature adds a privacy-respecting analytics integration (Plausible) to track key user actions and page views, enabling the team to prioritize features and identify drop-off points in the token creation flow — without collecting any personally identifiable information or wallet addresses.

The analytics infrastructure is partially scaffolded in the codebase (`frontend/src/services/analytics.ts`, `frontend/src/hooks/useAnalytics.ts`, `frontend/src/components/AnalyticsOptOut.tsx`). This spec covers completing and hardening that implementation.

## Glossary

- **Analytics_Service**: The `analytics.ts` module responsible for sending events and page views to Plausible.
- **Plausible**: The privacy-respecting, cookieless analytics provider used for event and page view tracking.
- **Opt_Out_Store**: The `localStorage` key (`analytics_opt_out`) that persists the user's opt-out preference.
- **Token_Creation_Flow**: The multi-step user journey from navigating to `/create`, submitting the token form, and receiving a success or failure result.
- **PII**: Personally Identifiable Information — includes wallet addresses, names, email addresses, and any data that can identify an individual.
- **CSP**: Content Security Policy — the HTTP header or meta tag that restricts which external resources the browser may load.

## Requirements

### Requirement 1: Plausible Script Injection

**User Story:** As a developer, I want the Plausible analytics script to be loaded only when configured, so that the app works correctly in environments without analytics credentials.

#### Acceptance Criteria

1. WHEN `VITE_PLAUSIBLE_DOMAIN` is set in the environment, THE Analytics_Service SHALL load the Plausible script by injecting a `<script>` tag with `defer` and `data-domain` attributes into the document `<head>`.
2. WHEN `VITE_PLAUSIBLE_DOMAIN` is not set, THE Analytics_Service SHALL not inject any external script tags.
3. THE Analytics_Service SHALL set the `data-api` attribute on the injected script to the Plausible API endpoint so that the CSP `connect-src` directive can be scoped to that origin.
4. IF the Plausible script fails to load, THEN THE Analytics_Service SHALL silently suppress the error and continue normal application operation.

---

### Requirement 2: Page View Tracking

**User Story:** As a product owner, I want page views tracked for each route, so that I can understand which parts of the app users visit most.

#### Acceptance Criteria

1. WHEN the active route changes, THE Analytics_Service SHALL call `trackPageView` with the new pathname.
2. THE Analytics_Service SHALL send the page view only when `VITE_PLAUSIBLE_DOMAIN` is configured and the user has not opted out.
3. THE Analytics_Service SHALL never include query parameters or hash fragments that could contain wallet addresses or other PII in the tracked URL path.
4. IF `trackPageView` throws an exception, THEN THE Analytics_Service SHALL catch the exception and not propagate it to the caller.

---

### Requirement 3: Wallet Connected Event

**User Story:** As a product owner, I want to know when users successfully connect their wallet, so that I can measure wallet adoption and connection success rates.

#### Acceptance Criteria

1. WHEN a wallet connection succeeds, THE Analytics_Service SHALL emit a `wallet_connected` event.
2. THE Analytics_Service SHALL not include the wallet address or any wallet-derived identifier in the event properties.
3. IF the wallet connection fails, THEN THE Analytics_Service SHALL not emit a `wallet_connected` event.

---

### Requirement 4: Token Creation Flow Events

**User Story:** As a product owner, I want to track the token creation funnel, so that I can identify where users drop off and improve the flow.

#### Acceptance Criteria

1. WHEN a user submits the token creation form, THE Analytics_Service SHALL emit a `token_creation_started` event.
2. WHEN token deployment completes successfully, THE Analytics_Service SHALL emit a `token_creation_succeeded` event.
3. WHEN token deployment fails, THE Analytics_Service SHALL emit a `token_creation_failed` event.
4. THE Analytics_Service SHALL not include the token address, creator wallet address, or any user-identifying data in any token creation event properties.
5. WHERE the network is available as a non-identifying property (e.g., `"testnet"` or `"mainnet"`), THE Analytics_Service SHALL include it as an event property to allow funnel analysis by network.

---

### Requirement 5: PII and Wallet Address Exclusion

**User Story:** As a user, I want assurance that my wallet address and personal data are never sent to third-party analytics, so that my privacy is protected.

#### Acceptance Criteria

1. THE Analytics_Service SHALL never include wallet addresses in any tracked event or page view.
2. THE Analytics_Service SHALL never include token contract addresses in any tracked event or page view.
3. THE Analytics_Service SHALL never include user-supplied token names, symbols, or metadata in any tracked event or page view.
4. WHEN constructing event properties, THE Analytics_Service SHALL only permit properties of type `string`, `number`, or `boolean` that are drawn from a predefined allowlist of safe property keys.

---

### Requirement 6: Analytics Opt-Out Mechanism

**User Story:** As a user, I want to opt out of analytics tracking, so that I can use the app without any data being sent to third parties.

#### Acceptance Criteria

1. THE Analytics_Service SHALL expose an `isOptedOut` function that reads the opt-out preference from the Opt_Out_Store.
2. THE Analytics_Service SHALL expose a `setOptOut(value: boolean)` function that persists the preference to the Opt_Out_Store.
3. WHEN `isOptedOut` returns `true`, THE Analytics_Service SHALL skip all `trackEvent` and `trackPageView` calls without throwing an error.
4. THE AnalyticsOptOut component SHALL render a visible checkbox control that reflects the current opt-out state.
5. WHEN the user toggles the opt-out checkbox, THE AnalyticsOptOut component SHALL call `setOptOut` with the new value and immediately stop or resume tracking.
6. WHEN `VITE_PLAUSIBLE_DOMAIN` is not configured, THE AnalyticsOptOut component SHALL not render.
7. IF `localStorage` is unavailable, THEN THE Analytics_Service SHALL treat the user as opted in and silently suppress the storage error.

---

### Requirement 7: Content Security Policy Compatibility

**User Story:** As a security-conscious developer, I want the analytics integration to be compatible with the existing CSP, so that no CSP violations are introduced.

#### Acceptance Criteria

1. THE Analytics_Service SHALL only make network requests to `https://plausible.io` (or the configured `data-api` endpoint).
2. WHEN the Plausible domain is configured, THE application CSP `connect-src` directive SHALL include `https://plausible.io` to permit analytics requests.
3. WHEN the Plausible domain is configured, THE application CSP `script-src` directive SHALL include `https://plausible.io` to permit the analytics script.
4. THE Analytics_Service SHALL not use `eval`, inline scripts, or any mechanism that would require `unsafe-inline` or `unsafe-eval` in the CSP.

---

### Requirement 8: Analytics Initialization

**User Story:** As a developer, I want analytics to be initialized once at application startup, so that page views and events are captured from the first interaction.

#### Acceptance Criteria

1. WHEN the application mounts, THE Analytics_Service SHALL be initialized before any route rendering occurs.
2. THE Analytics_Service SHALL be initialized at most once per application lifecycle, even if the initialization function is called multiple times (idempotent).
3. WHEN analytics is already initialized, THE Analytics_Service SHALL skip re-injection of the Plausible script.
