#!/usr/bin/env bash
set -euo pipefail

WASM_DIR="../../target/wasm32-unknown-unknown/release"
WASM_FILE="$WASM_DIR/token_factory.wasm"
OPTIMIZED_FILE="$WASM_DIR/token_factory.optimized.wasm"

echo "Building contract..."
cargo build --target wasm32-unknown-unknown --release

echo "Optimizing with wasm-opt..."
wasm-opt -Oz "$WASM_FILE" -o "$OPTIMIZED_FILE"

ORIGINAL=$(wc -c < "$WASM_FILE")
OPTIMIZED=$(wc -c < "$OPTIMIZED_FILE")
echo "Original:  $ORIGINAL bytes"
echo "Optimized: $OPTIMIZED bytes"
echo "Reduction: $(( (ORIGINAL - OPTIMIZED) * 100 / ORIGINAL ))%"
