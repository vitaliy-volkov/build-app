#!/bin/bash

# Development Deployment Script for Строй-Контроль
# This script handles deployment without root privileges

set -e

echo "🚀 Starting Development Deployment for Строй-Контроль"
echo "===================================================="

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Create local directories
create_directories() {
    log "Creating development directories..."
    
    mkdir -p data/{postgres,redis,minio,uploads,logs}
    mkdir -p logs/{backend,ai-gateway,nginx}
    
    success "Development directories created"
}

# Check and validate environment
check_environment() {
    log "Checking deployment environment..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    # Check if .secrets exists
    if [[ ! -f "$BACKEND_DIR/.secrets" ]]; then
        warning "Creating .secrets file from template..."
        cp "$BACKEND_DIR/.secrets.template" "$BACKEND_DIR/.secrets"
    fi
    
    success "Environment checks passed"
}

# Build and start services
deploy_services() {
    log "Starting development services..."
    
    cd "$BACKEND_DIR"
    
    # Stop any existing services
    docker-compose -f ../docker-compose.yml down --remove-orphans 2>/dev/null || true
    
    # Start basic services
    log "Starting database services..."
    docker-compose -f ../docker-compose.yml up -d postgres redis minio
    
    # Wait for database
    log "Waiting for PostgreSQL..."
    timeout=60
    counter=0
    while ! docker-compose -f ../docker-compose.yml exec -T postgres pg_isready -U stroy_user -d stroy_control 2>/dev/null; do
        sleep 2
        counter=$((counter + 2))
        if [[ $counter -ge $timeout ]]; then
            warning "Database timeout - continuing anyway..."
            break
        fi
        echo -n "."
    done
    echo ""
    success "Database is ready"
    
    # Build backend
    log "Building backend..."
    docker-compose -f ../docker-compose.yml build backend || warning "Backend build failed - continuing..."
    
    # Start all services
    log "Starting all services..."
    docker-compose -f ../docker-compose.yml up -d
    
    success "Services deployed"
}

# Quick health check
health_check() {
    log "Performing quick health checks..."
    
    services=("postgres" "redis" "minio")
    
    for service in "${services[@]}"; do
        if docker-compose -f ../docker-compose.yml ps --services --filter "status=running" | grep -q "$service"; then
            success "$service is running"
        else
            warning "$service might not be running properly"
        fi
    done
    
    # Check backend health endpoint if available
    if docker-compose -f ../docker-compose.yml ps backend | grep -q "Up"; then
        sleep 5  # Give backend time to start
        if curl -sf http://localhost:8080/health 2>/dev/null; then
            success "Backend health check passed"
        else
            warning "Backend health check failed - backend may still be starting"
        fi
    fi
}

# Show status
show_status() {
    echo ""
    echo "=============================================="
    echo "🎉 Строй-Контроль - Development Deployment"
    echo "=============================================="
    echo ""
    echo "📊 Service Status:"
    docker-compose -f ../docker-compose.yml ps
    echo ""
    echo "🔧 Development URLs:"
    echo "   • Application: http://localhost (if frontend served separately)"
    echo "   • Backend API: http://localhost:8080/api/v1"
    echo "   • Health:      http://localhost:8080/health"
    echo ""
    echo "🗄️  Database Management:"
    echo "   • PostgreSQL: localhost:5432"
    echo "   • PgAdmin:    http://localhost:8080 (if enabled)"
    echo "   • MinIO:      http://localhost:9001"
    echo ""
    echo "🔍 Useful Commands:"
    echo "   • View logs:   docker-compose -f ../docker-compose.yml logs -f [service]"
    echo "   • Stop:        docker-compose -f ../docker-compose.yml down"
    echo "   • Restart:     docker-compose -f ../docker-compose.yml restart"
    echo "   • Status:      docker-compose -f ../docker-compose.yml ps"
    echo ""
    echo "⚠️  Notes:"
    echo "   • This is a development deployment"
    echo "   • For production, use the full deployment script with sudo"
    echo "   • Some services may need more time to fully start"
    echo ""
}

# Main function
main() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "     Строй-Контроль - Development Deployment"
    echo "=============================================="
    echo -e "${NC}"
    
    check_environment
    create_directories
    deploy_services
    health_check
    show_status
    
    success "🎉 Development deployment completed!"
}

# Handle arguments
case "${1:-dev}" in
    "dev"|"deploy")
        main
        ;;
    "logs")
        cd "$BACKEND_DIR"
        docker-compose -f ../docker-compose.yml logs -f "${2:-}"
        ;;
    "stop")
        cd "$BACKEND_DIR"
        docker-compose -f ../docker-compose.yml down
        ;;
    "restart")
        cd "$BACKEND_DIR"
        docker-compose -f ../docker-compose.yml restart "${2:-}"
        ;;
    "status")
        cd "$BACKEND_DIR"
        docker-compose -f ../docker-compose.yml ps
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 {dev|logs|stop|restart|status|health}"
        echo ""
        echo "Commands:"
        echo "  dev     - Development deployment (default)"
        echo "  logs    - Show logs for services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart services"
        echo "  status  - Show service status"
        echo "  health  - Run health checks"
        exit 1
        ;;
esac