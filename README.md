# StellarForge - Stellar Token Deployer

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ejirowebfi/Stellar-forge&root=frontend&env=VITE_FACTORY_CONTRACT_ID,VITE_TOKEN_WASM_HASH,VITE_IPFS_API_KEY,VITE_IPFS_API_SECRET&envDescription=Required%20environment%20variables%20for%20StellarForge&envLink=https://github.com/Ejirowebfi/Stellar-forge/blob/main/docs/deployment-vercel.md)

StellarForge is a user-friendly decentralized application (dApp) that enables creators, entrepreneurs, and businesses in emerging markets to deploy custom tokens on the Stellar blockchain without writing a single line of code.

## Features

- **Token Factory Contract**: Deploy custom tokens on Stellar using Soroban smart contracts
- **Fee-Based System**: Configurable fees for token creation, metadata setting, and minting
- **IPFS Integration**: Store token metadata (images, descriptions) on IPFS via Pinata
- **Wallet Integration**: Connect with Freighter wallet for seamless transactions
- **Burn Functionality**: Burn tokens to reduce supply
- **Admin Controls**: Update fees and manage the factory
- **Network Switcher**: Toggle between testnet and mainnet from the UI
- **Transaction History**: View on-chain contract events with pagination
- **Testnet & Mainnet Support**: Deploy on both testnet and mainnet

## Tech Stack

### Backend (Smart Contracts)
- **Rust**: Programming language for Soroban contracts
- **Soroban SDK**: Stellar's smart contract development framework
- **Soroban Token SDK**: For token operations

### Frontend
- **React 19**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Vitest**: Testing framework

### Integrations
- **Freighter Wallet**: Stellar wallet browser extension
- **IPFS/Pinata**: Decentralized file storage for metadata
- **Stellar Horizon**: Blockchain data API
- **Soroban RPC**: Smart contract interaction

## Prerequisites

- **Rust**: For building Soroban contracts
- **Node.js** (v18+): For frontend development
- **Stellar CLI**: For contract deployment and testing (see setup below)
- **Freighter Wallet**: Browser extension for Stellar transactions

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd stellar-forge
```

### 2. Setup Stellar CLI Environment
Run the setup script to install Rust, Stellar CLI, and configure testnet:
```bash
./scripts/setup-soroban.sh
```

> **Note:** The Soroban CLI was renamed to `stellar` in recent versions. All commands below use `stellar`. If you have the old `soroban` binary installed, uninstall it and run the setup script again:
> ```bash
> cargo uninstall soroban-cli
> cargo install stellar-cli --features opt
> ```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Environment Variables
Copy the example env file and fill in your values:
Copy the example file and fill in your values:
```bash
cp frontend/.env.example frontend/.env
```

Then edit `frontend/.env`:
```env
VITE_NETWORK=testnet
VITE_FACTORY_CONTRACT_ID=<deployed-contract-id>
VITE_IPFS_API_KEY=<pinata-api-key>
VITE_IPFS_API_SECRET=<pinata-api-secret>
```

> **Note:** `VITE_FACTORY_CONTRACT_ID`, `VITE_IPFS_API_KEY`, and `VITE_IPFS_API_SECRET` are required. The app will display a misconfiguration screen if any of these are missing, rather than failing silently at runtime.

## Building & Testing

### Smart Contracts
```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

For an optimized binary (requires `binaryen` — install via `apt install binaryen` or `brew install binaryen`):
```bash
cd contracts/token-factory
bash build.sh
```
This produces `target/wasm32-unknown-unknown/release/token_factory.optimized.wasm`, which is significantly smaller and lowers on-chain deployment costs.

### Run Contract Tests
```bash
cd contracts/token-factory
cargo test
```

### Run Contract Fuzz Tests

Fuzz testing with random inputs discovers edge cases and potential crashes:

```bash
cd contracts/token-factory/fuzz
cargo fuzz run fuzz_create_token -- -timeout=60    # Test token creation
cargo fuzz run fuzz_fee_arithmetic -- -timeout=60  # Test fee calculations
cargo fuzz run fuzz_burn -- -timeout=60            # Test burn operations
```

For more details on fuzz testing setup and interpretation, see [contracts/token-factory/fuzz/README.md](contracts/token-factory/fuzz/README.md).

### Frontend
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
```

## Contract Functions

### Initialization
- `initialize(admin, treasury, base_fee, metadata_fee)`: Set up the factory with admin controls and fees

### Token Operations
- `create_token(creator, name, symbol, decimals, initial_supply, fee_payment)`: Deploy a new token
- `mint_tokens(token_address, admin, to, amount, fee_payment)`: Mint additional tokens
- `burn(token_address, from, amount)`: Burn tokens from supply

### Metadata
- `set_metadata(token_address, admin, metadata_uri, fee_payment)`: Set token metadata URI

### Admin Functions
- `update_fees(admin, base_fee?, metadata_fee?)`: Update factory fees
- `pause(admin)` / `unpause(admin)`: Pause or resume the factory

### View Functions
- `get_state()`: Get factory state
- `get_base_fee()`: Get token creation fee
- `get_metadata_fee()`: Get metadata setting fee
- `get_token_info(index)`: Get token information by index
- `get_tokens_by_creator(creator)`: Get all token indices created by a given address

## Usage

1. **Connect Wallet**: Use Freighter wallet to connect to the dApp
2. **Create Token**: Fill in token details (name, symbol, decimals, supply) and pay the creation fee
3. **Set Metadata**: Upload token image and description to IPFS
4. **Mint Tokens**: Mint additional tokens as needed
5. **Manage Supply**: Burn tokens to reduce circulating supply

## Deployment

### Contract Deployment
```bash
# Build the contract
cd contracts/token-factory
cargo build --target wasm32-unknown-unknown --release

# Optimize the binary (reduces size and lowers deployment costs)
stellar contract optimize \
  --wasm ../../target/wasm32-unknown-unknown/release/token_factory.wasm

# Deploy to testnet
stellar contract deploy \
  --wasm ../../target/wasm32-unknown-unknown/release/token_factory.optimized.wasm \
  --source <your-secret-key> \
  --network testnet

# Initialize the contract
stellar contract invoke \
  --id <contract-id> \
  --source <your-secret-key> \
  --network testnet \
  -- \
  initialize \
  --admin <admin-address> \
  --treasury <treasury-address> \
  --base_fee 70000000 \
  --metadata_fee 30000000
```

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting service (Vercel, Netlify, etc.)
```

For a full step-by-step Vercel deployment guide see [docs/deployment-vercel.md](./docs/deployment-vercel.md).

## Project Structure

```
stellar-forge/
├── contracts/                 # Soroban smart contracts
│   ├── Cargo.toml            # Workspace configuration
│   └── token-factory/        # Token factory contract
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs        # Contract implementation
│           └── test.rs       # Contract tests
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # UI components (NetworkSwitcher, TransactionHistory, ...)
│   │   ├── context/          # React contexts (Wallet, Toast, Network)
│   │   ├── services/         # API integrations (stellar, wallet, ipfs)
│   │   ├── hooks/            # React hooks
│   │   ├── config/           # Configuration files
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── scripts/                   # Setup scripts
│   └── setup-soroban.sh      # Installs Rust + Stellar CLI + configures testnet
└── README.md
```

## Security

We take security seriously. If you discover a security vulnerability, please review our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

### Content Security Policy (CSP)

A strict CSP is defined as a `<meta>` tag in `frontend/index.html`:

```
default-src 'self';
connect-src 'self' https://*.stellar.org https://api.pinata.cloud;
img-src 'self' data: https://gateway.pinata.cloud;
script-src 'self'
```

For stronger enforcement, set the CSP as an HTTP response header on your hosting provider instead of (or in addition to) the meta tag — HTTP headers take precedence and support more directives like `frame-ancestors`.

**Vercel** — add to `vercel.json`:
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

**Netlify** — add to `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://*.stellar.org https://api.pinata.cloud; img-src 'self' data: https://gateway.pinata.cloud; script-src 'self'"
```

**Nginx** — add to your server block:
```nginx
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://*.stellar.org https://api.pinata.cloud; img-src 'self' data: https://gateway.pinata.cloud; script-src 'self'";
```

For users deploying tokens, we strongly recommend:
- Always test on testnet first before mainnet deployment
- Review all parameters carefully using the mainnet deployment checklist
- Verify contract addresses and transaction details before signing

## Fee Bump Transactions

If a user's XLM balance is too low to cover the network base fee, their transaction will fail. Stellar's [fee bump](https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/fee-bump-transactions) mechanism lets a third-party account (the *fee source*) pay the base fee on behalf of the original sender.

### When to use fee bumps

- The inner transaction's source account has near-zero XLM.
- You want to sponsor fees for users as part of your application UX.
- Resubmitting a stuck transaction with a higher fee without re-signing the inner envelope.

### How it works in StellarForge

Two utilities are exported from `frontend/src/services/stellar.ts`:

```ts
// 1. Wrap a signed inner transaction in a fee bump envelope.
//    The fee-source account (connected via Freighter) signs the bump.
const signedFeeBumpXdr = await buildFeeBumpTransaction(innerTxXdr, feeSourceAddress)

// 2. Submit the fee bump and wait for confirmation.
const txHash = await submitFeeBumpTransaction(signedFeeBumpXdr)
```

The fee source must have enough XLM to cover the base fee. The inner transaction is not re-signed — only the fee bump envelope requires the fee source's signature.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development setup and contribution guidelines.

## Architecture Decision Records

Key architectural decisions are documented in [`docs/adr/`](./docs/adr/):

- [ADR-001: Choice of Stellar / Soroban for smart contracts](./docs/adr/ADR-001-stellar-soroban.md)
- [ADR-002: Freighter wallet integration](./docs/adr/ADR-002-freighter-wallet.md)
- [ADR-003: Pinata for IPFS metadata storage](./docs/adr/ADR-003-pinata-ipfs.md)
- [ADR-004: React + Vite + TypeScript for frontend](./docs/adr/ADR-004-react-vite-typescript.md)

## Contract Upgrade Process

The factory contract supports in-place WASM upgrades without redeploying or migrating state.

### How it works

1. Build and optimize the new contract WASM.
2. Upload the new WASM to the network to obtain its hash:
   ```bash
   stellar contract upload \
     --wasm target/wasm32-unknown-unknown/release/token_factory.optimized.wasm \
     --source <admin-secret-key> \
     --network testnet
   # Outputs: <new-wasm-hash>
   ```
3. Call `upgrade` on the deployed contract:
   ```bash
   stellar contract invoke \
     --id <contract-id> \
     --source <admin-secret-key> \
     --network testnet \
     -- upgrade \
     --admin <admin-address> \
     --new_wasm_hash <new-wasm-hash>
   ```
4. If the new version requires data layout changes, call `migrate` immediately after:
   ```bash
   stellar contract invoke \
     --id <contract-id> \
     --source <admin-secret-key> \
     --network testnet \
     -- migrate \
     --admin <admin-address>
   ```

Only the admin address can call `upgrade`. Non-admin callers receive `Error::Unauthorized`. Contract state (tokens, fees, admin) is fully preserved across upgrades.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This software is for educational and development purposes. Always test thoroughly on testnet before mainnet deployment. The authors are not responsible for any financial losses incurred through the use of this software.
