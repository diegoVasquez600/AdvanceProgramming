#!/bin/bash

# Script para verificar que todos los servicios EVA estén funcionando correctamente
# Uso: ./scripts/health-check.sh

set -e

echo "🏥 Verificando salud de servicios EVA..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de errores
ERRORS=0

# Función para verificar un endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    
    echo -n "🔍 Verificando $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_code" ] || [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
    else
        echo -e "${RED}❌ FALLO${NC} (HTTP $response, esperado: $expected_code)"
        ERRORS=$((ERRORS + 1))
    fi
}

# Función para verificar si un puerto está abierto
check_port() {
    local name=$1
    local host=$2
    local port=$3
    
    echo -n "🔌 Verificando $name en $host:$port... "
    
    if timeout 2 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
        echo -e "${GREEN}✅ Accesible${NC}"
    else
        echo -e "${RED}❌ No accesible${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICACIÓN DE SERVICIOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Docker
echo "🐳 Verificando Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker instalado${NC}"
else
    echo -e "${RED}❌ Docker no instalado${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Verificar servicios con docker compose
echo "🐱 Verificando servicios en Docker Compose..."
if docker compose ps &> /dev/null; then
    RUNNING=$(docker compose ps --services --filter "status=running" 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Docker Compose funcionando${NC}"
    echo "   Servicios activos: $RUNNING"
else
    echo -e "${YELLOW}⚠️  Docker Compose no ejecutado aún${NC}"
fi
echo ""

# Verificar puertos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 VERIFICACIÓN DE PUERTOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_port "Frontend" "localhost" "3000"
check_port "API" "localhost" "8000"
check_port "MLflow" "localhost" "5000"
check_port "MinIO API" "localhost" "9000"
check_port "MinIO Console" "localhost" "9001"
check_port "PostgreSQL" "localhost" "5432"
echo ""

# Verificar endpoints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 VERIFICACIÓN DE ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_endpoint "Frontend (GET /)" "http://localhost:3000" "200"
check_endpoint "API Health" "http://localhost:8000/api/v1/health" "200"
check_endpoint "API Models" "http://localhost:8000/api/v1/models" "200"
check_endpoint "API Docs" "http://localhost:8000/docs" "200"
check_endpoint "MLflow" "http://localhost:5000" "200"
echo ""

# Verificar Docker images
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 VERIFICACIÓN DE IMÁGENES DOCKER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -n "🔍 eva-api... "
if docker images | grep -q "eva-api"; then
    echo -e "${GREEN}✅ Presente${NC}"
else
    echo -e "${YELLOW}⚠️  No encontrada${NC}"
fi

echo -n "🔍 eva-frontend... "
if docker images | grep -q "eva-frontend"; then
    echo -e "${GREEN}✅ Presente${NC}"
else
    echo -e "${YELLOW}⚠️  No encontrada${NC}"
fi

echo -n "🔍 eva-trainer... "
if docker images | grep -q "eva-trainer"; then
    echo -e "${GREEN}✅ Presente${NC}"
else
    echo -e "${YELLOW}⚠️  No encontrada${NC}"
fi

echo -n "🔍 eva-mlflow... "
if docker images | grep -q "eva-mlflow"; then
    echo -e "${GREEN}✅ Presente${NC}"
else
    echo -e "${YELLOW}⚠️  No encontrada${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Resumen
echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS LOS SERVICIOS ESTÁN FUNCIONANDO CORRECTAMENTE${NC}"
    echo ""
    echo "📚 Documentación:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • API Docs: http://localhost:8000/docs"
    echo "  • MLflow: http://localhost:5000"
    exit 0
else
    echo -e "${RED}❌ SE ENCONTRARON $ERRORS PROBLEMAS${NC}"
    echo ""
    echo "💡 Solución:"
    echo "  1. Ejecuta: docker compose up -d"
    echo "  2. Espera 30 segundos para que los servicios inicien"
    echo "  3. Ejecuta nuevamente este script"
    exit 1
fi
