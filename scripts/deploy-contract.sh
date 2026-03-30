#!/usr/bin/env bash
set -euo pipefail

# ─── Usage ───────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 --network <testnet|mainnet> --admin <address> --treasury <address> [--source <secret-key>]"
  echo ""
  echo "  --network    Target network: testnet or mainnet (required)"
  echo "  --admin      Admin address for the contract (required)"
  echo "  --treasury   Treasury address for fee collection (required)"
  echo "  --source     Stellar secret key or account alias (required)"
  echo ""
  echo "Example:"
  echo "  $0 --network testnet --admin GABC... --treasury GXYZ... --source SXXX..."
  exit 1
}

# ─── Parse arguments ─────────────────────────────────────────────────────────
NETWORK=""
ADMIN=""
TREASURY=""
SOURCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)  NETWORK="$2";   shift 2 ;;
    --admin)    ADMIN="$2";     shift 2 ;;
    --treasury) TREASURY="$2";  shift 2 ;;
    --source)   SOURCE="$2";    shift 2 ;;
    -h|--help)  usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

# ─── Validate required arguments ─────────────────────────────────────────────
MISSING=()
[[ -z "$NETWORK" ]]   && MISSING+=("--network")
[[ -z "$ADMIN" ]]     && MISSING+=("--admin")
[[ -z "$TREASURY" ]]  && MISSING+=("--treasury")
[[ -z "$SOURCE" ]]    && MISSING+=("--source")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "Error: Missing required arguments: ${MISSING[*]}"
  echo ""
  usage
fi

if [[ "$NETWORK" != "testnet" && "$NETWORK" != "mainnet" ]]; then
  echo "Error: --network must be 'testnet' or 'mainnet', got '$NETWORK'"
  exit 1
fi

# ─── Validate dependencies ───────────────────────────────────────────────────
for cmd in stellar cargo wasm-opt; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is not installed or not in PATH."
    [[ "$cmd" == "stellar" ]] && echo "  Run: cargo install stellar-cli --features opt"
    [[ "$cmd" == "wasm-opt" ]] && echo "  Run: apt install binaryen  OR  brew install binaryen"
    exit 1
  fi
done

# ─── Paths ───────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACT_DIR="$REPO_ROOT/contracts/token-factory"
WASM_DIR="$REPO_ROOT/target/wasm32-unknown-unknown/release"
WASM_FILE="$WASM_DIR/token_factory.wasm"
OPTIMIZED_WASM="$WASM_DIR/token_factory.optimized.wasm"
FRONTEND_ENV="$REPO_ROOT/frontend/.env"

# ─── Default fees ────────────────────────────────────────────────────────────
BASE_FEE=70000000
METADATA_FEE=30000000

# ─── Step 1: Build ───────────────────────────────────────────────────────────
echo ""
echo "▶ Building contract WASM..."
(cd "$CONTRACT_DIR" && cargo build --target wasm32-unknown-unknown --release)

echo "▶ Optimizing WASM with wasm-opt..."
wasm-opt -Oz "$WASM_FILE" -o "$OPTIMIZED_WASM"
echo "  Optimized: $OPTIMIZED_WASM"

# ─── Step 2: Deploy ──────────────────────────────────────────────────────────
echo ""
echo "▶ Deploying contract to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMIZED_WASM" \
  --source "$SOURCE" \
  --network "$NETWORK" 2>&1)

# Validate the contract ID looks like a Stellar contract address
if [[ ! "$CONTRACT_ID" =~ ^C[A-Z0-9]{55}$ ]]; then
  echo "Error: Deployment failed or returned unexpected output:"
  echo "$CONTRACT_ID"
  exit 1
fi

echo "  Contract ID: $CONTRACT_ID"

# ─── Step 3: Initialize ──────────────────────────────────────────────────────
echo ""
echo "▶ Initializing contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  -- \
  initialize \
  --admin "$ADMIN" \
  --treasury "$TREASURY" \
  --base_fee "$BASE_FEE" \
  --metadata_fee "$METADATA_FEE"

echo "  Contract initialized."

# ─── Step 4: Save to .env ────────────────────────────────────────────────────
echo ""
echo "▶ Saving contract ID to $FRONTEND_ENV..."

# Create .env from example if it doesn't exist
if [[ ! -f "$FRONTEND_ENV" ]]; then
  cp "$REPO_ROOT/frontend/.env.example" "$FRONTEND_ENV"
fi

# Update or append VITE_FACTORY_CONTRACT_ID
if grep -q "^VITE_FACTORY_CONTRACT_ID=" "$FRONTEND_ENV"; then
  sed -i "s|^VITE_FACTORY_CONTRACT_ID=.*|VITE_FACTORY_CONTRACT_ID=$CONTRACT_ID|" "$FRONTEND_ENV"
else
  echo "VITE_FACTORY_CONTRACT_ID=$CONTRACT_ID" >> "$FRONTEND_ENV"
fi

# Update or append VITE_NETWORK
if grep -q "^VITE_NETWORK=" "$FRONTEND_ENV"; then
  sed -i "s|^VITE_NETWORK=.*|VITE_NETWORK=$NETWORK|" "$FRONTEND_ENV"
else
  echo "VITE_NETWORK=$NETWORK" >> "$FRONTEND_ENV"
fi

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "✅ Deployment complete!"
echo "   Network:     $NETWORK"
echo "   Contract ID: $CONTRACT_ID"
echo "   Saved to:    $FRONTEND_ENV"
