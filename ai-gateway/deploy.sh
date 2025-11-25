#!/bin/bash

# AI Gateway Production Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
NAMESPACE="stroy-control"
DOCKER_REGISTRY="stroy-control"
IMAGE_TAG="v1.0"

echo "🚀 Deploying AI Gateway to $ENVIRONMENT"
echo "📦 Namespace: $NAMESPACE"
echo "🏷️  Image tag: $IMAGE_TAG"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    # Check kubernetes cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Build and push Docker image
build_and_push_image() {
    print_status "Building Docker image..."
    
    # Build image
    docker build -t $DOCKER_REGISTRY/ai-gateway:$IMAGE_TAG .
    
    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
    
    # Push image (uncomment when registry is configured)
    # print_status "Pushing Docker image to registry..."
    # docker push $DOCKER_REGISTRY/ai-gateway:$IMAGE_TAG
    
    # For now, just tag it for local deployment
    print_warning "Skipping image push (registry not configured)"
}

# Create namespace
create_namespace() {
    print_status "Creating namespace: $NAMESPACE"
    
    kubectl apply -f k8s/namespace.yaml
    
    if [ $? -eq 0 ]; then
        print_success "Namespace created/updated"
    else
        print_error "Failed to create namespace"
        exit 1
    fi
}

# Deploy Redis
deploy_redis() {
    print_status "Deploying Redis..."
    
    # Apply Redis deployment
    kubectl apply -f k8s/redis-deployment.yaml -n $NAMESPACE
    
    if [ $? -eq 0 ]; then
        print_success "Redis deployment applied"
    else
        print_error "Failed to deploy Redis"
        exit 1
    fi
    
    # Wait for Redis to be ready
    print_status "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    if [ $? -eq 0 ]; then
        print_success "Redis is ready"
    else
        print_error "Redis failed to become ready"
        exit 1
    fi
}

# Deploy AI Gateway
deploy_ai_gateway() {
    print_status "Deploying AI Gateway..."
    
    # Apply ConfigMap and Secret first
    kubectl apply -f k8s/configmap.yaml -n $NAMESPACE
    kubectl apply -f k8s/secret.yaml -n $NAMESPACE
    
    # Apply AI Gateway deployment
    kubectl apply -f k8s/ai-gateway-deployment.yaml -n $NAMESPACE
    
    if [ $? -eq 0 ]; then
        print_success "AI Gateway deployment applied"
    else
        print_error "Failed to deploy AI Gateway"
        exit 1
    fi
    
    # Wait for AI Gateway to be ready
    print_status "Waiting for AI Gateway to be ready..."
    kubectl wait --for=condition=ready pod -l app=ai-gateway -n $NAMESPACE --timeout=600s
    
    if [ $? -eq 0 ]; then
        print_success "AI Gateway is ready"
    else
        print_error "AI Gateway failed to become ready"
        exit 1
    fi
}

# Setup Ingress
setup_ingress() {
    print_status "Setting up Ingress..."
    
    kubectl apply -f k8s/ingress.yaml -n $NAMESPACE
    
    if [ $? -eq 0 ]; then
        print_success "Ingress configured"
    else
        print_error "Failed to setup Ingress"
        exit 1
    fi
}

# Setup Horizontal Pod Autoscaler
setup_hpa() {
    print_status "Setting up Horizontal Pod Autoscaler..."
    
    kubectl apply -f k8s/hpa.yaml -n $NAMESPACE
    
    if [ $? -eq 0 ]; then
        print_success "HPA configured"
    else
        print_error "Failed to setup HPA"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check pods
    print_status "Checking pod status..."
    kubectl get pods -n $NAMESPACE
    
    # Check services
    print_status "Checking services..."
    kubectl get services -n $NAMESPACE
    
    # Check ingress
    print_status "Checking ingress..."
    kubectl get ingress -n $NAMESPACE
    
    # Check HPA
    print_status "Checking HPA..."
    kubectl get hpa -n $NAMESPACE
    
    print_success "Deployment verification completed"
}

# Test endpoints
test_endpoints() {
    print_status "Testing endpoints..."
    
    # Get service URL
    SERVICE_URL=$(kubectl get ingress ai-gateway-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    
    if [ -z "$SERVICE_URL" ]; then
        print_warning "Could not get service URL, using localhost"
        SERVICE_URL="localhost"
    fi
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -f -s "http://$SERVICE_URL/health" > /dev/null; then
        print_success "Health endpoint is working"
    else
        print_error "Health endpoint is not responding"
    fi
    
    # Test auth endpoint
    print_status "Testing authentication endpoint..."
    AUTH_RESPONSE=$(curl -s -X POST "http://$SERVICE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "user", "password": "user123"}')
    
    if echo "$AUTH_RESPONSE" | grep -q "access_token"; then
        print_success "Authentication endpoint is working"
    else
        print_error "Authentication endpoint is not working"
    fi
    
    print_success "Endpoint testing completed"
}

# Show deployment info
show_deployment_info() {
    print_status "Deployment Information:"
    echo ""
    echo "📊 Namespace: $NAMESPACE"
    echo "🏷️  Image: $DOCKER_REGISTRY/ai-gateway:$IMAGE_TAG"
    echo "🌐 Ingress URL: $(kubectl get ingress ai-gateway-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo 'Not configured')"
    echo "📈 HPA: $(kubectl get hpa ai-gateway-hpa -n $NAMESPACE -o jsonpath='{.spec.minReplicas}-{.spec.maxReplicas}' 2>/dev/null || echo 'Not configured')"
    echo ""
    echo "🔧 Useful commands:"
    echo "  kubectl logs -f deployment/ai-gateway -n $NAMESPACE"
    echo "  kubectl exec -it deployment/ai-gateway -n $NAMESPACE -- bash"
    echo "  kubectl port-forward service/ai-gateway-service 8000:8000 -n $NAMESPACE"
    echo ""
    echo "📊 Monitoring:"
    echo "  Prometheus: http://prometheus:9090"
    echo "  Grafana: http://grafana:3000"
    echo ""
    echo "🧪 Load Testing:"
    echo "  cd load_test && ./run_load_test.sh 100 10 300"
    echo ""
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    # Add any cleanup tasks here
}

# Main deployment flow
main() {
    print_status "Starting AI Gateway deployment to $ENVIRONMENT"
    echo ""
    
    # Trap to cleanup on exit
    trap cleanup EXIT
    
    # Execute deployment steps
    check_prerequisites
    build_and_push_image
    create_namespace
    deploy_redis
    deploy_ai_gateway
    setup_ingress
    setup_hpa
    verify_deployment
    test_endpoints
    show_deployment_info
    
    print_success "🎉 AI Gateway deployment completed successfully!"
    echo ""
    print_warning "📋 TODO: Complete Grafana dashboard setup"
    print_warning "📋 TODO: Configure production monitoring alerts"
    print_warning "📋 TODO: Set up SSL certificates"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "AI Gateway Deployment Script"
        echo ""
        echo "Usage: $0 [environment]"
        echo ""
        echo "Environments:"
        echo "  production (default) - Production deployment"
        echo "  staging              - Staging deployment"
        echo "  development          - Development deployment"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy to production"
        echo "  $0 staging           # Deploy to staging"
        echo "  $0 development       # Deploy to development"
        echo ""
        exit 0
        ;;
    "")
        main
        ;;
    *)
        ENVIRONMENT=$1
        main
        ;;
esac
