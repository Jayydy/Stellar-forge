# Docker Development Environment

This document provides a quick reference for using the Docker development environment for StellarForge.

## Quick Start

```bash
# Start the development environment
docker compose up -d

# Frontend will be available at: http://localhost:5173
# Access contract builder: docker compose exec contract-builder bash
```

## Services

### Frontend Service
- **Port**: 5173
- **Hot Reload**: ✅ Enabled via volume mounts
- **Command**: `npm run dev`
- **Access**: http://localhost:5173

### Contract Builder Service
- **Interactive Shell**: `docker compose exec contract-builder bash`
- **Tools Included**: Rust, Stellar CLI, wasm-opt
- **Hot Reload**: ✅ Source mounted as volume
- **Target Cache**: Persisted in Docker volume

## Common Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Access contract builder
docker compose exec contract-builder bash

# Run frontend tests
docker compose exec frontend npm run test -- --run

# Run contract tests (from inside contract-builder)
docker compose exec contract-builder bash -c "cd token-factory && cargo test"

# Stop services
docker compose down

# Clean up (removes volumes)
docker compose down -v
```

## Development Workflow

### Frontend Development
1. Start services: `docker compose up -d`
2. Edit files in `frontend/src/`
3. Changes auto-reload at http://localhost:5173
4. View logs: `docker compose logs -f frontend`

### Contract Development
1. Access builder: `docker compose exec contract-builder bash`
2. Navigate to contract: `cd token-factory`
3. Make changes to `src/` files
4. Test: `cargo test`
5. Build: `cargo build --target wasm32-unknown-unknown --release`
6. Optimize: `./build.sh`

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5173
lsof -i :5173

# Stop conflicting process or change port in docker-compose.yml
```

### Container Won't Start
```bash
# Check logs
docker compose logs frontend
docker compose logs contract-builder

# Rebuild containers
docker compose build --no-cache
```

### Hot Reload Not Working
```bash
# Restart frontend service
docker compose restart frontend

# Check volume mounts
docker compose exec frontend ls -la /app
```

### Contract Build Issues
```bash
# Access container and debug
docker compose exec contract-builder bash
cd token-factory
cargo clean
cargo build --target wasm32-unknown-unknown --release
```

## Performance Tips

- Use `.dockerignore` files to exclude unnecessary files
- The `contracts_target` volume persists Rust build cache
- Frontend `node_modules` is excluded from volume mount for performance

## Comparison with Local Setup

| Feature | Docker | Local |
|---------|--------|-------|
| Setup Time | ~5 minutes | ~15-30 minutes |
| Consistency | Identical everywhere | Varies by system |
| Performance | ~95% native | 100% native |
| Isolation | Complete | Shared with system |
| Updates | Rebuild container | Update tools manually |

Choose Docker for consistency and quick setup. Choose local for maximum performance and integration with system tools.