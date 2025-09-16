#!/bin/bash

# Build script for Science Map project
set -e

echo "🚀 Building Science Map Docker images..."

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

# Build backend services
print_status "Building backend services..."

services=("api-gateway" "graph-service" "search-service" "auth-service" "jobs-service")

for service in "${services[@]}"; do
    print_status "Building $service..."
    docker build -t science-map/$service:latest backend/$service/
    if [ $? -eq 0 ]; then
        print_status "✅ $service built successfully"
    else
        print_error "❌ Failed to build $service"
        exit 1
    fi
done

# Build frontend
print_status "Building frontend..."
docker build -t science-map/frontend:latest frontend/
if [ $? -eq 0 ]; then
    print_status "✅ Frontend built successfully"
else
    print_error "❌ Failed to build frontend"
    exit 1
fi

print_status "🎉 All Docker images built successfully!"
print_status "You can now run: docker-compose -f infrastructure/docker-compose.prod.yml up"
