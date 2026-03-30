#!/bin/bash
set -euo pipefail

# Docker Development Environment Helper Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🐳 StellarForge Docker Development Environment"
echo "=============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose v2:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the development environment"
    echo "  stop      Stop the development environment"
    echo "  restart   Restart the development environment"
    echo "  logs      Show logs from all services"
    echo "  frontend  Show frontend logs only"
    echo "  contracts Enter the contract builder shell"
    echo "  test      Run all tests in containers"
    echo "  clean     Stop and remove all containers and volumes"
    echo "  status    Show status of all services"
    echo ""
}

# Parse command
COMMAND="${1:-start}"

case "$COMMAND" in
    "start")
        echo "🚀 Starting development environment..."
        docker compose up -d
        echo ""
        echo "✅ Services started!"
        echo "   Frontend: http://localhost:5173"
        echo "   Contract builder: docker compose exec contract-builder bash"
        echo ""
        echo "📝 View logs: $0 logs"
        ;;
    
    "stop")
        echo "🛑 Stopping development environment..."
        docker compose down
        echo "✅ Services stopped!"
        ;;
    
    "restart")
        echo "🔄 Restarting development environment..."
        docker compose restart
        echo "✅ Services restarted!"
        ;;
    
    "logs")
        echo "📋 Showing logs from all services (Ctrl+C to exit)..."
        docker compose logs -f
        ;;
    
    "frontend")
        echo "📋 Showing frontend logs (Ctrl+C to exit)..."
        docker compose logs -f frontend
        ;;
    
    "contracts")
        echo "🔧 Entering contract builder shell..."
        docker compose exec contract-builder bash
        ;;
    
    "test")
        echo "🧪 Running tests..."
        echo "Frontend tests:"
        docker compose exec frontend npm run test -- --run
        echo ""
        echo "Contract tests:"
        docker compose exec contract-builder bash -c "cd token-factory && cargo test"
        ;;
    
    "clean")
        echo "🧹 Cleaning up development environment..."
        docker compose down -v
        docker system prune -f
        echo "✅ Cleanup complete!"
        ;;
    
    "status")
        echo "📊 Service status:"
        docker compose ps
        ;;
    
    "help"|"-h"|"--help")
        show_usage
        ;;
    
    *)
        echo "❌ Unknown command: $COMMAND"
        echo ""
        show_usage
        exit 1
        ;;
esac