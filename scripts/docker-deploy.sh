#!/bin/bash

# Deployment script for Science Map project
set -e

echo "🚀 Deploying Science Map to production..."

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose file exists
if [ ! -f "infrastructure/docker-compose.prod.yml" ]; then
    print_error "Production docker-compose file not found!"
    exit 1
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f infrastructure/docker-compose.prod.yml down

# Pull latest images (if using registry)
print_status "Pulling latest images..."
docker-compose -f infrastructure/docker-compose.prod.yml pull

# Build and start services
print_status "Building and starting services..."
docker-compose -f infrastructure/docker-compose.prod.yml up --build -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

services=("api-gateway" "graph-service" "search-service" "auth-service" "jobs-service" "frontend")

for service in "${services[@]}"; do
    if docker-compose -f infrastructure/docker-compose.prod.yml ps $service | grep -q "Up"; then
        print_status "✅ $service is running"
    else
        print_error "❌ $service is not running"
        docker-compose -f infrastructure/docker-compose.prod.yml logs $service
    fi
done

print_status "🎉 Deployment completed!"
print_status "Services are available at:"
print_status "  - Frontend: http://localhost:3006"
print_status "  - API Gateway: http://localhost:3000"
print_status "  - Graph Service: http://localhost:3002"
print_status "  - Search Service: http://localhost:3003"
print_status "  - Auth Service: http://localhost:3004"
print_status "  - Jobs Service: http://localhost:3005"
print_status "  - Grafana: http://localhost:3001 (admin/admin)"
print_status "  - Prometheus: http://localhost:9090"
