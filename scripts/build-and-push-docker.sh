#!/bin/bash

# Script para construir y subir imágenes Docker a Docker Hub
# Uso: ./scripts/build-and-push-docker.sh [version]
# Ejemplo: ./scripts/build-and-push-docker.sh 1.0.0

set -e

DOCKER_HUB_USER="${DOCKER_HUB_USER:-diegovasquez600}"
REGISTRY="${REGISTRY:-docker.io}"
VERSION="${1:-latest}"

echo "🔨 Construyendo y subiendo imágenes Docker para: $DOCKER_HUB_USER"
echo "📦 Versión: $VERSION"
echo ""

# Verificar que el usuario haya hecho login en Docker Hub
docker_info=$(docker info 2>&1 || true)
if echo "$docker_info" | grep -q "ERROR"; then
    echo "❌ Error: No estás loggeado en Docker Hub"
    echo "Ejecuta: docker login"
    exit 1
fi

echo "✅ Docker login verificado"
echo ""

# Array de imágenes a construir
declare -a IMAGES=(
    "eva-api:services/api/Dockerfile"
    "eva-frontend:apps/frontend/Dockerfile"
    "eva-trainer:services/trainer/Dockerfile"
    "eva-mlflow:mlops/mlflow/Dockerfile"
)

# Construir y subir cada imagen
for image_info in "${IMAGES[@]}"; do
    IFS=':' read -r image_name dockerfile <<< "$image_info"
    
    FULL_IMAGE_NAME="$DOCKER_HUB_USER/$image_name"
    TAG_VERSIONED="$FULL_IMAGE_NAME:$VERSION"
    TAG_LATEST="$FULL_IMAGE_NAME:latest"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Construyendo: $TAG_VERSIONED"
    echo "📄 Dockerfile: $dockerfile"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Construir imagen
    docker build \
        -f "$dockerfile" \
        -t "$TAG_VERSIONED" \
        -t "$TAG_LATEST" \
        --progress=plain \
        .
    
    if [ $? -eq 0 ]; then
        echo "✅ Construcción exitosa: $TAG_VERSIONED"
        echo ""
        echo "📤 Subiendo a Docker Hub..."
        
        # Subir versión etiquetada
        docker push "$TAG_VERSIONED"
        
        # Subir como latest
        docker push "$TAG_LATEST"
        
        echo "✅ Subida completada"
        echo ""
    else
        echo "❌ Error en la construcción de $image_name"
        exit 1
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ¡Todas las imágenes construidas y subidas exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Imágenes disponibles en Docker Hub:"
echo ""
for image_info in "${IMAGES[@]}"; do
    IFS=':' read -r image_name _ <<< "$image_info"
    echo "  • $DOCKER_HUB_USER/$image_name:$VERSION"
    echo "  • $DOCKER_HUB_USER/$image_name:latest"
done
echo ""
