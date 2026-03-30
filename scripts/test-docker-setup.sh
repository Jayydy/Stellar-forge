#!/bin/bash
set -euo pipefail

# Test script to verify Docker development environment

echo "🧪 Testing Docker Development Environment"
echo "========================================"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose v2."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Start services
echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Test frontend service
echo "🌐 Testing frontend service..."
if curl -f -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend is responding on port 5173"
else
    echo "❌ Frontend is not responding"
    docker compose logs frontend
    exit 1
fi

# Test contract builder service
echo "🔧 Testing contract builder service..."
if docker compose exec -T contract-builder bash -c "which cargo && which stellar" > /dev/null; then
    echo "✅ Contract builder has required tools (cargo, stellar)"
else
    echo "❌ Contract builder is missing required tools"
    docker compose logs contract-builder
    exit 1
fi

# Test contract compilation
echo "🦀 Testing contract compilation..."
if docker compose exec -T contract-builder bash -c "cd token-factory && cargo check --target wasm32-unknown-unknown" > /dev/null; then
    echo "✅ Contract compiles successfully"
else
    echo "❌ Contract compilation failed"
    docker compose exec contract-builder bash -c "cd token-factory && cargo check --target wasm32-unknown-unknown"
    exit 1
fi

# Test frontend build
echo "📦 Testing frontend build..."
if docker compose exec -T frontend npm run build > /dev/null; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed"
    docker compose logs frontend
    exit 1
fi

echo ""
echo "🎉 All tests passed! Docker development environment is working correctly."
echo ""
echo "Next steps:"
echo "  - Frontend: http://localhost:5173"
echo "  - Contract shell: docker compose exec contract-builder bash"
echo "  - Stop services: docker compose down"

# Clean up
docker compose down