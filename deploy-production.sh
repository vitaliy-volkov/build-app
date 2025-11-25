#!/bin/bash

# Production Deployment Script for Строй-Контроль
# This script handles the complete production deployment process

set -e

echo "🚀 Starting Production Deployment for Строй-Контроль"
echo "=================================================="

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"
AI_GATEWAY_DIR="$PROJECT_ROOT/ai-gateway"
DEPLOYMENT_DIR="/opt/stroy-control"

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

# Check if running as root for production deployment
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. This is expected for production deployment."
    else
        warning "Not running as root. Some operations may require sudo privileges."
    fi
}

# Create deployment directories
create_directories() {
    log "Creating deployment directories..."
    
    sudo mkdir -p "$DEPLOYMENT_DIR"/{postgres,redis,minio,uploads,logs,backups,cache,elasticsearch}
    sudo mkdir -p "$DEPLOYMENT_DIR/logs"/{backend,ai-gateway,nginx}
    
    # Set proper permissions
    sudo chown -R 1000:1000 "$DEPLOYMENT_DIR" || true
    sudo chmod -R 755 "$DEPLOYMENT_DIR"
    
    success "Deployment directories created"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Copy environment template if .secrets doesn't exist
    if [[ ! -f "$BACKEND_DIR/.secrets" ]]; then
        warning ".secrets file not found. Copying from template..."
        cp "$BACKEND_DIR/.secrets.template" "$BACKEND_DIR/.secrets"
        warning "Please edit $BACKEND_DIR/.secrets with your actual production values before continuing!"
        read -p "Press Enter after you've configured the secrets file..."
    fi
    
    # Validate critical environment variables
    source "$BACKEND_DIR/.secrets" 2>/dev/null || true
    
    # Check critical variables
    required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]] || [[ "${!var}" == *"change_me"* ]]; then
            error "Critical environment variable $var is not properly set in .secrets"
        fi
    done
    
    success "Environment variables validated"
}

# Generate SSL certificates (if not exists)
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if [[ ! -f "$BACKEND_DIR/nginx/ssl/fullchain.pem" ]]; then
        log "Generating self-signed certificates for development..."
        cd "$BACKEND_DIR"
        ./generate-ssl.sh
        warning "Using self-signed certificates. For production, obtain certificates from a trusted CA."
    else
        success "SSL certificates already exist"
    fi
}

# Build frontend (if needed)
build_frontend() {
    log "Building frontend for production..."
    
    if [[ ! -d "dist" ]] || [[ "dist" -ot "src" ]]; then
        log "Frontend build required. Installing dependencies and building..."
        cd "$FRONTEND_DIR"
        npm install --production
        npm run build
        success "Frontend built successfully"
    else
        success "Frontend already built"
    fi
}

# Pull Docker images
pull_images() {
    log "Pulling Docker images..."
    
    docker-compose -f "$BACKEND_DIR/docker-compose.production.yml" pull || error "Failed to pull Docker images"
    
    success "Docker images pulled successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    cd "$BACKEND_DIR"
    
    # Stop existing services if running
    docker-compose -f docker-compose.production.yml down --remove-orphans || true
    
    # Start database and cache services first
    log "Starting database services..."
    docker-compose -f docker-compose.production.yml up -d postgres redis minio
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout=60
    counter=0
    while ! docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U stroy_user -d stroy_control; do
        sleep 2
        counter=$((counter + 2))
        if [[ $counter -ge $timeout ]]; then
            error "Database failed to start within $timeout seconds"
        fi
    done
    success "Database is ready"
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec postgres psql -U stroy_user -d stroy_control -f /docker-entrypoint-initdb.d/001_initial_schema.sql
    docker-compose -f docker-compose.production.yml exec postgres psql -U stroy_user -d stroy_control -f /docker-entrypoint-initdb.d/002_test_data.sql
    success "Database migrations completed"
    
    # Start all services
    log "Starting all services..."
    docker-compose -f docker-compose.production.yml up -d
    
    success "Services deployed successfully"
}

# Health checks
health_checks() {
    log "Performing health checks..."
    
    services=("nginx" "backend" "postgres" "redis" "minio" "ai-gateway")
    max_attempts=30
    attempt=0
    
    for service in "${services[@]}"; do
        log "Checking $service..."
        attempt=0
        
        while [[ $attempt -lt $max_attempts ]]; do
            if docker-compose -f "$BACKEND_DIR/docker-compose.production.yml" ps --services --filter "status=running" | grep -q "$service"; then
                # For nginx, check HTTP endpoint
                if [[ "$service" == "nginx" ]]; then
                    if curl -sf http://localhost/health >/dev/null 2>&1; then
                        success "$service is healthy"
                        break
                    fi
                else
                    success "$service is running"
                    break
                fi
            fi
            
            attempt=$((attempt + 1))
            if [[ $attempt -eq $max_attempts ]]; then
                error "Health check failed for $service after $max_attempts attempts"
            fi
            
            sleep 2
        done
    done
}

# Display service information
show_info() {
    log "Deployment completed successfully!"
    echo ""
    echo "=============================================="
    echo "🎉 Строй-Контроль - Production Deployment"
    echo "=============================================="
    echo ""
    echo "📋 Service URLs:"
    echo "   • Application: https://stroy-control.local"
    echo "   • API Health:  https://stroy-control.local/health"
    echo "   • Backend API: https://stroy-control.local/api/v1"
    echo "   • AI Gateway:  https://stroy-control.local/ai"
    echo ""
    echo "🔧 Management URLs:"
    echo "   • Grafana:     http://localhost:3000"
    echo "   • Prometheus:  http://localhost:9091"
    echo "   • PgAdmin:     http://localhost:8080"
    echo "   • Kibana:      http://localhost:5601"
    echo ""
    echo "📊 Default Credentials:"
    echo "   • Grafana: admin / [set in .secrets]"
    echo "   • PgAdmin: admin@stroy-control.local / admin123"
    echo ""
    echo "🗂️  File Locations:"
    echo "   • Data:        $DEPLOYMENT_DIR"
    echo "   • Logs:        $DEPLOYMENT_DIR/logs"
    echo "   • Backups:     $DEPLOYMENT_DIR/backups"
    echo ""
    echo "🔍 Quick Commands:"
    echo "   • View logs:   docker-compose -f $BACKEND_DIR/docker-compose.production.yml logs -f"
    echo "   • Stop all:    docker-compose -f $BACKEND_DIR/docker-compose.production.yml down"
    echo "   • Restart svc: docker-compose -f $BACKEND_DIR/docker-compose.production.yml restart <service>"
    echo ""
    echo "⚠️  Next Steps:"
    echo "   1. Update DNS records to point your domain to this server"
    echo "   2. Replace self-signed SSL certificates with production certificates"
    echo "   3. Configure backup automation"
    echo "   4. Set up monitoring alerts"
    echo "   5. Run load testing"
    echo ""
}

# Main deployment function
main() {
    echo -e "${BLUE}"
    echo "================================================"
    echo "     Строй-Контроль - Production Deployment"
    echo "================================================"
    echo -e "${NC}"
    
    check_permissions
    create_directories
    setup_environment
    setup_ssl
    build_frontend
    pull_images
    deploy_services
    health_checks
    show_info
    
    success "🎉 Production deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "logs")
        cd "$BACKEND_DIR"
        docker-compose -f docker-compose.production.yml logs -f "${2:-}"
        ;;
    "stop")
        cd "$BACKEND_DIR"
        docker-compose -f docker-compose.production.yml down
        ;;
    "restart")
        cd "$BACKEND_DIR"
        docker-compose -f docker-compose.production.yml restart "${2:-}"
        ;;
    "status")
        cd "$BACKEND_DIR"
        docker-compose -f docker-compose.production.yml ps
        ;;
    "health")
        health_checks
        ;;
    *)
        echo "Usage: $0 {deploy|logs|stop|restart|status|health}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full production deployment (default)"
        echo "  logs    - Show logs for all services or specific service"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services or specific service"
        echo "  status  - Show service status"
        echo "  health  - Run health checks"
        exit 1
        ;;
esac