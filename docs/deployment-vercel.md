# Deploying StellarForge to Vercel

This guide walks you through deploying the StellarForge frontend to [Vercel](https://vercel.com) from scratch.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier is sufficient)
- The StellarForge repo forked or pushed to your GitHub account
- A deployed Soroban token-factory contract (see the main [README](../README.md))
- Pinata API credentials for IPFS metadata uploads

---

## 1. Import the Repository

1. Go to [vercel.com/new](https://vercel.com/new) and click **Add New → Project**.
2. Select **Import Git Repository** and authorise Vercel to access your GitHub account.
3. Find and select your `Stellar-forge` fork, then click **Import**.

---

## 2. Configure the Build

Vercel auto-detects Vite projects. Confirm or set the following in the **Configure Project** screen:

| Setting | Value |
|---|---|
| Framework Preset | **Vite** |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

> **Root Directory** is the most important setting. Click **Edit** next to it and type `frontend` so Vercel runs all commands inside the `frontend/` folder.

---

## 3. Set Environment Variables

In the **Environment Variables** section of the same screen (or later under **Project → Settings → Environment Variables**), add the following:

| Variable | Required | Description |
|---|---|---|
| `VITE_NETWORK` | No | `testnet` or `mainnet`. Defaults to `testnet`. |
| `VITE_FACTORY_CONTRACT_ID` | **Yes** | The deployed Soroban factory contract address (`C...`). |
| `VITE_TOKEN_WASM_HASH` | **Yes** | WASM hash of the token contract used for token creation. |
| `VITE_IPFS_API_KEY` | **Yes** | Pinata API key — get one at [app.pinata.cloud/keys](https://app.pinata.cloud/keys). |
| `VITE_IPFS_API_SECRET` | **Yes** | Pinata API secret. |

Set each variable for the **Production**, **Preview**, and **Development** environments as appropriate. For preview deployments you may want `VITE_NETWORK=testnet` regardless of the production value.

> The app will display a misconfiguration screen instead of failing silently if any required variable is missing.

---

## 4. Deploy

Click **Deploy**. Vercel will install dependencies, run `npm run build`, and publish the `dist/` folder. The first deploy takes ~2 minutes.

Once complete, Vercel assigns a URL like `https://stellar-forge-<hash>.vercel.app`.

---

## 5. Custom Domain

1. Open your project on Vercel and go to **Settings → Domains**.
2. Click **Add**, enter your domain (e.g. `app.stellarforge.xyz`), and click **Add**.
3. Vercel shows the DNS records to add. In your DNS provider, add:
   - An **A record** pointing to `76.76.21.21`, **or**
   - A **CNAME record** pointing to `cname.vercel-dns.com` (for subdomains).
4. Wait for DNS propagation (usually under 5 minutes with Vercel's nameservers). Vercel provisions a TLS certificate automatically.

---

## 6. Content Security Policy Header

The repo ships a CSP `<meta>` tag in `frontend/index.html`. For stronger enforcement, add an HTTP response header via `vercel.json` in the **repo root**:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; connect-src 'self' https://*.stellar.org https://api.pinata.cloud; img-src 'self' data: https://gateway.pinata.cloud; script-src 'self'"
        }
      ]
    }
  ]
}
```

A `vercel.json` with this configuration is included at the repo root.

---

## 7. Preview Deployments for Pull Requests

Vercel automatically creates a unique preview URL for every pull request — no extra configuration needed. Each preview is isolated and uses the environment variables you set for the **Preview** environment.

**Recommended setup:**

- Set `VITE_NETWORK=testnet` for the **Preview** environment so PRs always deploy against testnet.
- Set `VITE_NETWORK=mainnet` (and production contract IDs) only for the **Production** environment.

You can manage per-environment variable values under **Project → Settings → Environment Variables** by toggling the environment checkboxes next to each variable.

---

## 8. Redeploying After a Contract Upgrade

When you deploy a new contract version and the contract ID or WASM hash changes:

1. Go to **Project → Settings → Environment Variables**.
2. Update `VITE_FACTORY_CONTRACT_ID` and/or `VITE_TOKEN_WASM_HASH`.
3. Go to **Deployments**, find the latest production deployment, click **⋯ → Redeploy**.

No code change is needed — Vercel rebuilds with the new variable values.
