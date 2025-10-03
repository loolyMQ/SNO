#!/bin/bash

set -e

echo "🚀 Installing Istio Service Mesh for Science Map Platform..."

# Download Istio
ISTIO_VERSION="1.19.0"
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
export PATH=$PWD/istio-$ISTIO_VERSION/bin:$PATH

# Install Istio with demo profile
istioctl install --set values.defaultRevision=default -y

# Enable Istio injection for science-map-platform namespace
kubectl label namespace science-map-platform istio-injection=enabled

# Apply Istio configurations
kubectl apply -f k8s/istio-gateway.yaml
kubectl apply -f k8s/istio-monitoring.yaml
kubectl apply -f k8s/istio-security.yaml

# Install Istio addons (Prometheus, Grafana, Jaeger, Kiali)
kubectl apply -f istio-$ISTIO_VERSION/samples/addons/prometheus.yaml
kubectl apply -f istio-$ISTIO_VERSION/samples/addons/grafana.yaml
kubectl apply -f istio-$ISTIO_VERSION/samples/addons/jaeger.yaml
kubectl apply -f istio-$ISTIO_VERSION/samples/addons/kiali.yaml

echo "✅ Istio Service Mesh installed successfully!"
echo "📊 Access monitoring dashboards:"
echo "   - Kiali: kubectl port-forward svc/kiali 20001:20001 -n istio-system"
echo "   - Grafana: kubectl port-forward svc/grafana 3000:3000 -n istio-system"
echo "   - Jaeger: kubectl port-forward svc/tracing 16686:16686 -n istio-system"
echo "   - Prometheus: kubectl port-forward svc/prometheus 9090:9090 -n istio-system"



