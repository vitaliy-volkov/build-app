#!/bin/bash

# Monitoring Deployment Script for Строительная система управления
# This script deploys Prometheus, Grafana, Alertmanager and other monitoring components

set -e

echo "🚀 Starting monitoring deployment for Строительная система управления..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if the monitoring directory exists
if [ ! -d "monitoring" ]; then
    print_error "Monitoring directory not found. Please run this script from the project root."
    exit 1
fi

print_status "Creating monitoring network..."
docker network create monitoring 2>/dev/null || print_warning "Network monitoring already exists"

# Pull required images
print_status "Pulling monitoring images..."
docker-compose -f monitoring/docker-compose.yml pull

# Start the monitoring stack
print_status "Starting monitoring services..."
docker-compose -f monitoring/docker-compose.yml up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Check service status
print_status "Checking service status..."
services=("prometheus:9090" "grafana:3000" "alertmanager:9093" "node-exporter:9100" "redis-exporter:9121" "cadvisor:8080")

for service in "${services[@]}"; do
    name=$(echo $service | cut -d':' -f1)
    port=$(echo $service | cut -d':' -f2)
    
    if curl -f -s "http://localhost:$port" > /dev/null 2>&1; then
        print_status "✅ $name is running on port $port"
    else
        print_warning "⚠️  $name might still be starting up (port $port)"
    fi
done

print_status "🎉 Monitoring stack deployed successfully!"
echo ""
echo "📊 Service URLs:"
echo "   • Prometheus:  http://localhost:9090"
echo "   • Grafana:     http://localhost:3000 (admin/admin123)"
echo "   • Alertmanager: http://localhost:9093"
echo "   • Node Exporter: http://localhost:9100"
echo "   • Redis Exporter: http://localhost:9121"
echo "   • cAdvisor:     http://localhost:8080"
echo ""
echo "📝 Next steps:"
echo "   1. Configure alert rules in monitoring/alert_rules.yml"
echo "   2. Set up Grafana dashboards at http://localhost:3000"
echo "   3. Configure alerting in alertmanager.yml"
echo "   4. Test endpoints with curl commands"
echo ""
echo "🛑 To stop monitoring: docker-compose -f monitoring/docker-compose.yml down"