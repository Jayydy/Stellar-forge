# Monitoring Runbook

## Environment Variables

Add these to your `.env.production` (never commit real values):

| Variable | Required | Description |
|---|---|---|
| `VITE_SENTRY_DSN` | Yes | Sentry project DSN from Project Settings → Client Keys |
| `VITE_APP_VERSION` | Yes | Injected at build time (e.g. git tag or `npm version`) |
| `VITE_BETTERUPTIME_WEBHOOK_URL` | No | BetterUptime alert webhook for Slack/PagerDuty |

---

## BetterUptime Setup

**URL to monitor:** `https://<your-domain>/health.json`
(served as a static file from `public/health.json`, rebuilt on every deploy)

1. Log in to [BetterUptime](https://betteruptime.com) → New Monitor
2. URL: `https://<your-domain>/health.json`
3. Check interval: **60 seconds**
4. Expected status code: **200**
5. Expected keyword: `"status":"ok"` (keyword check)
6. Alert contacts: add your on-call email or Slack webhook
7. No authentication required — the file is public

---

## Sentry Alert Rules

Navigate to **Sentry → Alerts → Create Alert Rule** for each rule below.

### 1. Error Rate Spike (catch-all)
- Condition: Number of events > **20** in **5 minutes**
- Filter: none (all errors)
- Action: Notify team via email / Slack

### 2. Horizon API Failures
- Condition: Number of events > **10** in **5 minutes**
- Filter: `category` tag = `horizon_api`
- Action: Notify on-call channel
- Runbook: see below

### 3. IPFS Failures
- Condition: Number of events > **5** in **10 minutes**
- Filter: `category` tag = `ipfs`
- Action: Notify on-call channel
- Runbook: see below

### 4. Contract Failures
- Condition: Any occurrence
- Filter: `category` tag = `contract`
- Action: Page on-call immediately
- Runbook: see below

---

## Alert Runbooks

### Horizon API Failures (`category: horizon_api`)
**What it means:** The app failed to reach `horizon.stellar.org` or received a non-2xx response.

**First steps:**
1. Check [Stellar Status](https://status.stellar.org) for network incidents
2. Inspect the `endpoint` and `status` fields in the Sentry event for specifics
3. Check `responseTime` — values > 5000ms suggest network degradation

**Escalation:** If the outage exceeds 10 minutes and Stellar Status shows no incident, escalate to the infrastructure team.

---

### IPFS / Pinata Failures (`category: ipfs`)
**What it means:** A metadata upload or fetch via Pinata failed.

**First steps:**
1. Check [Pinata Status](https://status.pinata.cloud)
2. Inspect `operation` (upload vs fetch) and `cid` in the Sentry event
3. Verify `VITE_IPFS_API_KEY` / `VITE_IPFS_API_SECRET` are set correctly in production

**Escalation:** If credentials are valid and Pinata is healthy, check for rate limiting (HTTP 429 in the event context).

---

### Contract Failures (`category: contract`)
**What it means:** A Soroban contract call failed — could be a simulation error, submission rejection, or unexpected revert.

**First steps:**
1. Check the `method` and `txHash` fields in the Sentry event
2. Look up the `txHash` on [Stellar Expert](https://stellar.expert) to see the raw error
3. Check if the factory contract was recently upgraded or paused

**Escalation:** Contract failures are high-severity. Page the smart contract team immediately if the `deployToken` or `mintTokens` methods are affected.
