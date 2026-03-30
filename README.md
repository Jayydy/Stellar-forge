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

You can set up StellarForge using either Docker (recommended for quick start) or local installation.

### Option 1: Docker Setup (Recommended)

**Prerequisites**: Docker and Docker Compose

```bash
# Clone the repository
git clone <repository-url>
cd stellar-forge

# Start development environment
docker compose up -d

# Frontend available at: http://localhost:5173
# Access contract builder: docker compose exec contract-builder bash
```

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker instructions.

### Option 2: Local Installation

**Prerequisites**: Rust, Node.js (v18+), Stellar CLI, Freighter Wallet

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

### Testnet Deployment Guide

This guide walks you through deploying StellarForge to Stellar testnet from scratch.

#### Prerequisites

- Stellar CLI installed (run `./scripts/setup-soroban.sh` if not)
- Freighter wallet installed in your browser
- Basic understanding of command line

#### Step 1: Get Testnet XLM

You need testnet XLM to pay for contract deployment and transactions.

1. **Create a testnet account** using Stellar CLI:
   ```bash
   stellar keys generate deployer --network testnet
   ```
   This creates a new keypair and saves it locally. The output shows your public key.

2. **Fund your account** using Friendbot:
   ```bash
   stellar keys address deployer
   # Copy the address (starts with G...)
   
   # Fund with 10,000 testnet XLM
   curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS_HERE"
   ```

3. **Verify your balance**:
   ```bash
   stellar account balance deployer --network testnet
   ```
   You should see 10,000 XLM.

#### Step 2: Build the Contract

```bash
cd contracts/token-factory

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Optimize the binary (reduces size and deployment costs)
stellar contract optimize \
  --wasm ../../target/wasm32-unknown-unknown/release/token_factory.wasm
```

The optimized WASM will be at `../../target/wasm32-unknown-unknown/release/token_factory.optimized.wasm`.

#### Step 3: Deploy the Factory Contract

```bash
# Deploy to testnet
stellar contract deploy \
  --wasm ../../target/wasm32-unknown-unknown/release/token_factory.optimized.wasm \
  --source deployer \
  --network testnet

# Save the contract ID (starts with C...)
# Example output: CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Save this contract ID** - you'll need it for initialization and frontend configuration.

#### Step 4: Upload Token Contract WASM

The factory needs the token contract WASM hash to deploy tokens.

```bash
# First, build the standard Stellar token contract
# (or use your custom token implementation)
stellar contract install \
  --wasm path/to/soroban_token_contract.wasm \
  --source deployer \
  --network testnet

# Save the WASM hash (64 hex characters)
# Example: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

If you don't have a token WASM, you can use the Stellar Asset Contract:
```bash
# Download the official Stellar token contract
wget https://github.com/stellar/soroban-examples/raw/main/token/target/wasm32-unknown-unknown/release/soroban_token_contract.wasm

# Install it
stellar contract install \
  --wasm soroban_token_contract.wasm \
  --source deployer \
  --network testnet
```

#### Step 5: Initialize the Factory

```bash
# Get your admin address (same as deployer for simplicity)
ADMIN_ADDRESS=$(stellar keys address deployer)

# Initialize the contract
stellar contract invoke \
  --id <FACTORY_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  initialize \
  --admin $ADMIN_ADDRESS \
  --treasury $ADMIN_ADDRESS \
  --fee_token <NATIVE_XLM_CONTRACT_ADDRESS> \
  --base_fee 100000000 \
  --metadata_fee 50000000
```

**Parameters explained:**
- `admin`: Address that can update fees and pause the factory
- `treasury`: Address that receives fees from token creation
- `fee_token`: Contract address for the fee token (use native XLM contract: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`)
- `base_fee`: Fee for creating a token (in stroops, 1 XLM = 10,000,000 stroops)
- `metadata_fee`: Fee for setting token metadata

#### Step 6: Configure Frontend

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

Update these required variables:
```env
VITE_NETWORK=testnet
VITE_FACTORY_CONTRACT_ID=<your-factory-contract-id>
VITE_TOKEN_WASM_HASH=<your-token-wasm-hash>
VITE_IPFS_API_KEY=<your-pinata-api-key>
VITE_IPFS_API_SECRET=<your-pinata-api-secret>
```

**Getting Pinata credentials:**
1. Sign up at [https://app.pinata.cloud](https://app.pinata.cloud)
2. Go to API Keys → New Key
3. Enable "pinFileToIPFS" permission
4. Copy the API Key and API Secret

#### Step 7: Test Locally

```bash
# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

1. Connect your Freighter wallet (make sure it's on testnet)
2. Try creating a test token
3. Verify the transaction on [Stellar Expert](https://stellar.expert/explorer/testnet)

#### Step 8: Deploy Frontend

```bash
# Build for production
npm run build

# Deploy the dist/ folder to your hosting service
```

**Deployment options:**
- **Vercel**: See [docs/deployment-vercel.md](./docs/deployment-vercel.md)
- **Netlify**: Drag and drop the `dist/` folder
- **GitHub Pages**: Use `gh-pages` package
- **Your own server**: Serve the `dist/` folder with nginx/apache

### Mainnet Deployment

⚠️ **Warning**: Mainnet deployment involves real money. Test thoroughly on testnet first!

The process is identical to testnet, but:
1. Use `--network mainnet` instead of `--network testnet`
2. Fund your account with real XLM (buy from an exchange)
3. Set `VITE_NETWORK=mainnet` in your `.env`
4. Review all parameters carefully before deployment
5. Consider using a hardware wallet for the admin key

### Troubleshooting Deployment

#### Error: "account not found"
Your account doesn't exist on the network yet. Fund it with Friendbot (testnet) or send XLM from an exchange (mainnet).

```bash
# Testnet
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

#### Error: "insufficient balance"
You don't have enough XLM to pay for the transaction.

```bash
# Check balance
stellar account balance deployer --network testnet

# Get more testnet XLM
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

#### Error: "contract already initialized"
The contract has already been initialized. You can't initialize it again. If you need to change parameters, deploy a new contract.

#### Error: "wasm not found"
The WASM hash you provided doesn't exist on the network. Make sure you ran `stellar contract install` first and used the correct hash.

#### Build fails with "target not found"
Add the wasm32 target to Rust:
```bash
rustup target add wasm32-unknown-unknown
```

#### Frontend shows "Misconfiguration Screen"
One or more required environment variables are missing. Check that your `.env` file has:
- `VITE_FACTORY_CONTRACT_ID`
- `VITE_TOKEN_WASM_HASH`
- `VITE_IPFS_API_KEY`
- `VITE_IPFS_API_SECRET`

Restart the dev server after changing `.env` files.

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

## Architecture

StellarForge consists of three main components that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    React Frontend                         │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │  UI Layer   │  │   Services   │  │   Wallet SDK    │ │ │
│  │  │ Components  │→ │ stellar.ts   │→ │   Freighter     │ │ │
│  │  │  Forms      │  │ ipfs.ts      │  │   Integration   │ │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               ↓
              ┌────────────────┴────────────────┐
              │                                 │
              ↓                                 ↓
┌─────────────────────────┐      ┌─────────────────────────┐
│   Stellar Network       │      │    IPFS (Pinata)        │
│                         │      │                         │
│  ┌──────────────────┐   │      │  ┌──────────────────┐   │
│  │ Factory Contract │   │      │  │ Token Metadata   │   │
│  │  - create_token  │   │      │  │  - Images        │   │
│  │  - mint_tokens   │   │      │  │  - Descriptions  │   │
│  │  - burn          │   │      │  │  - JSON files    │   │
│  │  - set_metadata  │   │      │  └──────────────────┘   │
│  └────────┬─────────┘   │      └─────────────────────────┘
│           │             │
│           ↓             │
│  ┌──────────────────┐   │
│  │ Token Contracts  │   │
│  │ (deployed by     │   │
│  │  factory)        │   │
│  │  - transfer      │   │
│  │  - balance       │   │
│  │  - approve       │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

### Component Interactions

1. **User → Frontend**: User interacts with React UI to create tokens, set metadata, etc.

2. **Frontend → Freighter**: Frontend uses Freighter API to request transaction signatures

3. **Frontend → Stellar Network**: Signed transactions are submitted to Stellar via Soroban RPC

4. **Factory Contract → Token Contracts**: Factory deploys new token contracts using the token WASM hash

5. **Frontend → IPFS**: Token metadata (images, descriptions) are uploaded to IPFS via Pinata

6. **Frontend → Stellar Network**: Metadata URIs (ipfs://...) are stored on-chain via `set_metadata`

### Data Flow Example: Creating a Token

```
1. User fills form → 2. Frontend validates → 3. Freighter signs tx
                                                      ↓
                                            4. Submit to Stellar
                                                      ↓
                                            5. Factory Contract
                                               - Validates params
                                               - Collects fee
                                               - Deploys token
                                                      ↓
                                            6. New Token Contract
                                               - Initialized
                                               - Mints supply
                                                      ↓
                                            7. Event emitted
                                                      ↓
                                            8. Frontend updates UI
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Freighter Wallet Not Detected

**Symptoms**: "Wallet not installed" error or connection button doesn't work

**Solutions**:
- Install [Freighter wallet extension](https://www.freighter.app/)
- Refresh the page after installing
- Check that Freighter is enabled in your browser extensions
- Try a different browser (Chrome, Firefox, Brave, Edge supported)

#### 2. Wrong Network Selected

**Symptoms**: Transactions fail with "account not found" or "contract not found"

**Solutions**:
- Check the network indicator in the top-right corner of the app
- Click the network switcher to toggle between testnet and mainnet
- In Freighter, ensure you're on the same network as the app
- Verify `VITE_NETWORK` in your `.env` matches your deployment

#### 3. Insufficient Balance / Fee Errors

**Symptoms**: "insufficient balance" or "insufficient fee" errors

**Solutions**:
- **Testnet**: Get free XLM from Friendbot:
  ```bash
  curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS"
  ```
- **Mainnet**: Buy XLM from an exchange and send to your wallet
- Check your balance in Freighter wallet
- Ensure you have at least 2-3 XLM for contract interactions
- Fee errors may indicate the factory's fee requirements have increased

#### 4. Transaction Timeout

**Symptoms**: Transaction pending for a long time, then fails

**Solutions**:
- Check Stellar network status at [status.stellar.org](https://status.stellar.org)
- Increase timeout in the code (default is 30 seconds)
- Try submitting the transaction again
- Check if Soroban RPC endpoint is responding:
  ```bash
  curl https://soroban-testnet.stellar.org/health
  ```

#### 5. IPFS Upload Fails

**Symptoms**: "Failed to upload metadata" or IPFS errors

**Solutions**:
- Verify your Pinata API credentials in `.env`
- Check Pinata dashboard for API key status
- Ensure image file is under 10MB
- Try a different image format (PNG, JPG, GIF supported)
- Check Pinata service status at [status.pinata.cloud](https://status.pinata.cloud)

#### 6. Contract Initialization Fails

**Symptoms**: "AlreadyInitialized" error or initialization transaction fails

**Solutions**:
- Contract can only be initialized once
- If you need different parameters, deploy a new contract
- Check if contract is already initialized:
  ```bash
  stellar contract invoke \
    --id <contract-id> \
    --network testnet \
    -- get_state
  ```

#### 7. Token Creation Fails

**Symptoms**: "InvalidTokenParams" or creation transaction fails

**Solutions**:
- Ensure token name is 1-32 characters
- Ensure token symbol is 1-12 characters
- Decimals must be 0-18
- Initial supply must be non-negative
- Check that you have enough XLM to pay the creation fee
- Verify the factory is not paused:
  ```bash
  stellar contract invoke \
    --id <contract-id> \
    --network testnet \
    -- get_state
  ```

#### 8. Metadata Not Displaying

**Symptoms**: Token created but image/description doesn't show

**Solutions**:
- Check that metadata was set (look for `metadata_set` event)
- Verify IPFS URI is accessible:
  ```bash
  curl https://gateway.pinata.cloud/ipfs/<your-cid>
  ```
- Clear browser cache and reload
- Check browser console for CORS or loading errors
- Ensure metadata JSON follows the correct format:
  ```json
  {
    "name": "Token Name",
    "description": "Token description",
    "image": "ipfs://..."
  }
  ```

#### 9. Build Errors

**Symptoms**: `cargo build` or `npm run build` fails

**Solutions**:
- **Rust build fails**:
  ```bash
  rustup update
  rustup target add wasm32-unknown-unknown
  cd contracts && cargo clean && cargo build
  ```
- **Frontend build fails**:
  ```bash
  cd frontend
  rm -rf node_modules package-lock.json
  npm install
  npm run build
  ```
- Check that you're using compatible versions (Node 18+, Rust stable)

#### 10. Events Not Loading

**Symptoms**: Transaction history or token events don't display

**Solutions**:
- Check that Soroban RPC endpoint supports `getEvents`
- Verify contract ID is correct in `.env`
- Check browser console for API errors
- Try refreshing the page
- Ensure you're on the correct network (testnet/mainnet)

### Getting More Help

If you're still experiencing issues:

1. **Check the logs**: Open browser DevTools (F12) and check the Console tab
2. **Search existing issues**: [GitHub Issues](https://github.com/Ejirowebfi/Stellar-forge/issues)
3. **Ask for help**: Create a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Error messages (from browser console and terminal)
   - Your environment (OS, browser, Node version)
4. **Join the community**: Stellar Discord or developer forums

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
