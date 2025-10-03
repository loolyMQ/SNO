#!/bin/bash

set -e

echo "🚀 Generating gRPC TypeScript types from proto files..."

# Install protoc-gen-ts if not already installed
if ! command -v protoc-gen-ts &> /dev/null; then
    echo "Installing protoc-gen-ts..."
    npm install -g protoc-gen-ts
fi

# Create output directory
mkdir -p platform/shared/src/generated

# Generate TypeScript types for each proto file
echo "Generating types for auth.proto..."
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=platform/shared/src/generated \
  --proto_path=platform/shared/src/proto \
  platform/shared/src/proto/auth.proto

echo "Generating types for graph.proto..."
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=platform/shared/src/generated \
  --proto_path=platform/shared/src/proto \
  platform/shared/src/proto/graph.proto

echo "Generating types for search.proto..."
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=platform/shared/src/generated \
  --proto_path=platform/shared/src/proto \
  platform/shared/src/proto/search.proto

echo "Generating types for jobs.proto..."
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=platform/shared/src/generated \
  --proto_path=platform/shared/src/proto \
  platform/shared/src/proto/jobs.proto

echo "✅ gRPC TypeScript types generated successfully!"
echo "📁 Generated files are in platform/shared/src/generated/"



