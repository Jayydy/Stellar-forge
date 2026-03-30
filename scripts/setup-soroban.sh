#!/bin/bash

# Setup Stellar CLI environment
# This script installs Rust, Stellar CLI, and configures the environment
# It is idempotent and safe to run multiple times

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track what was installed/configured
INSTALLED_RUST=false
INSTALLED_STELLAR=false
CONFIGURED_NETWORK=false
COPIED_ENV=false

echo -e "${GREEN}Setting up Stellar CLI environment...${NC}"
echo ""

# Function to print error and exit
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install Rust if not present
if ! command_exists rustc; then
    echo -e "${YELLOW}Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y || error_exit "Failed to install Rust"
    source "$HOME/.cargo/env"
    INSTALLED_RUST=true
else
    echo -e "${GREEN}✓ Rust is already installed${NC}"
fi

# Add wasm32 target
echo "Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown || error_exit "Failed to add wasm32 target"

# Install Stellar CLI (replaces the old soroban-cli crate)
if ! command_exists stellar; then
    echo -e "${YELLOW}Installing Stellar CLI...${NC}"
    cargo install stellar-cli --features opt || error_exit "Failed to install Stellar CLI"
    INSTALLED_STELLAR=true
else
    echo -e "${GREEN}✓ Stellar CLI is already installed${NC}"
fi

# Verify stellar CLI is available
if ! command_exists stellar; then
    error_exit "Stellar CLI installation failed. Please install manually:\n  cargo install stellar-cli --features opt"
fi
echo -e "${GREEN}✓ Stellar CLI version: $(stellar --version)${NC}"

# Check Node.js version (require v18+)
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "${YELLOW}⚠ Warning: Node.js v18 or higher is recommended (found v${NODE_VERSION})${NC}"
        echo "  Consider upgrading: https://nodejs.org/"
    else
        echo -e "${GREEN}✓ Node.js v${NODE_VERSION} is installed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Warning: Node.js is not installed${NC}"
    echo "  Consider installing Node.js v18+ for frontend development: https://nodejs.org/"
fi

# Configure testnet (idempotent - will update if already exists)
echo "Configuring Stellar testnet network..."
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  --force || error_exit "Failed to configure testnet network"
CONFIGURED_NETWORK=true

# Copy .env.example to .env if .env doesn't exist
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env || error_exit "Failed to copy .env.example to .env"
    COPIED_ENV=true
    echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
    echo -e "${YELLOW}  Please update .env with your configuration${NC}"
elif [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Print summary
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$INSTALLED_RUST" = true ]; then
    echo "✓ Installed Rust"
fi

if [ "$INSTALLED_STELLAR" = true ]; then
    echo "✓ Installed Stellar CLI"
fi

if [ "$CONFIGURED_NETWORK" = true ]; then
    echo "✓ Configured testnet network"
fi

if [ "$COPIED_ENV" = true ]; then
    echo "✓ Created .env file"
fi

echo ""
echo "Next steps:"
echo "  1. Build contracts: cd contracts && cargo build"
echo "  2. Run tests: cd contracts && cargo test"
echo "  3. Deploy contracts: stellar contract deploy ..."
echo ""
echo -e "${GREEN}You're ready to build and deploy Soroban contracts!${NC}"
