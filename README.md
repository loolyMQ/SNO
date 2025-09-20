# Science Map

Interactive scientific visualization platform with microservices architecture.

## Architecture

### Backend Services
- **API Gateway** (3001): Main entry point, routes requests to microservices
- **Auth Service** (3003): User authentication and authorization
- **Graph Service** (3002): Graph data management and physics simulation
- **Search Service** (3004): Full-text search and data indexing
- **Jobs Service** (3005): Background job processing

### Infrastructure
- **Kafka**: Event streaming and message queuing
- **Prometheus**: Metrics collection and monitoring
- **Grafana**: Dashboards and visualization
- **Zookeeper**: Kafka coordination

### Frontend
- **React + Vite**: Modern web interface with interactive graph visualization

## Quick Start

### Development
```bash
npm run install:all
npm run dev
```

### Docker
```bash
docker-compose up
```

## Services

- Frontend: http://localhost:3000
- API Gateway: http://localhost:3001
- Graph Service: http://localhost:3002
- Auth Service: http://localhost:3003
- Search Service: http://localhost:3004
- Jobs Service: http://localhost:3005
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
