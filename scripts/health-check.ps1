# Script para verificar salud de servicios EVA (PowerShell)
# Uso: .\scripts\health-check.ps1

$ErrorActionPreference = "Continue"

Write-Host "🏥 Verificando salud de servicios EVA..." -ForegroundColor Cyan
Write-Host ""

# Contador de errores
$ERRORS = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedCode = 200
    )
    
    Write-Host -NoNewline "🔍 Verificando $Name... "
    
    try {
        $response = Invoke-WebRequest -Uri $Url -ErrorAction SilentlyContinue -TimeoutSec 5
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq $ExpectedCode -or $statusCode -eq 200) {
            Write-Host "✅ OK (HTTP $statusCode)" -ForegroundColor Green
        } else {
            Write-Host "❌ FALLO (HTTP $statusCode, esperado: $ExpectedCode)" -ForegroundColor Red
            $script:ERRORS++
        }
    } catch {
        Write-Host "❌ No responde" -ForegroundColor Red
        $script:ERRORS++
    }
}

function Test-Port {
    param(
        [string]$Name,
        [string]$Host,
        [int]$Port
    )
    
    Write-Host -NoNewline "🔌 Verificando $Name en $Host`:$Port... "
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.ConnectAsync($Host, $Port).Wait(2000) | Out-Null
        
        if ($tcpClient.Connected) {
            Write-Host "✅ Accesible" -ForegroundColor Green
            $tcpClient.Close()
        } else {
            Write-Host "❌ No accesible" -ForegroundColor Red
            $script:ERRORS++
        }
    } catch {
        Write-Host "❌ No accesible" -ForegroundColor Red
        $script:ERRORS++
    }
}

# Header
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📊 VERIFICACIÓN DE SERVICIOS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Verificar Docker
Write-Host "🐳 Verificando Docker..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker instalado" -ForegroundColor Green
} else {
    Write-Host "❌ Docker no instalado" -ForegroundColor Red
    $ERRORS++
}
Write-Host ""

# Verificar Docker Compose
Write-Host "🐱 Verificando Docker Compose..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        $services = docker compose ps --services 2>$null | Measure-Object -Line
        Write-Host "✅ Docker Compose funcionando" -ForegroundColor Green
        Write-Host "   Servicios: $($services.Lines)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Docker Compose no ejecutado aún" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Docker no disponible" -ForegroundColor Red
}
Write-Host ""

# Verificar puertos
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🌐 VERIFICACIÓN DE PUERTOS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Test-Port "Frontend" "localhost" 3000
Test-Port "API" "localhost" 8000
Test-Port "MLflow" "localhost" 5000
Test-Port "MinIO API" "localhost" 9000
Test-Port "MinIO Console" "localhost" 9001
Test-Port "PostgreSQL" "localhost" 5432
Write-Host ""

# Verificar endpoints
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🔗 VERIFICACIÓN DE ENDPOINTS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Test-Endpoint "Frontend (GET /)" "http://localhost:3000" 200
Test-Endpoint "API Health" "http://localhost:8000/api/v1/health" 200
Test-Endpoint "API Models" "http://localhost:8000/api/v1/models" 200
Test-Endpoint "API Docs" "http://localhost:8000/docs" 200
Test-Endpoint "MLflow" "http://localhost:5000" 200
Write-Host ""

# Verificar imágenes Docker
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📦 VERIFICACIÓN DE IMÁGENES DOCKER" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

$images = @("eva-api", "eva-frontend", "eva-trainer", "eva-mlflow")
foreach ($image in $images) {
    Write-Host -NoNewline "🔍 $image... "
    $exists = docker images --format "{{.Repository}}" | Select-String $image -ErrorAction SilentlyContinue
    if ($exists) {
        Write-Host "✅ Presente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No encontrada" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Resumen
Write-Host ""
if ($ERRORS -eq 0) {
    Write-Host "✅ TODOS LOS SERVICIOS ESTÁN FUNCIONANDO CORRECTAMENTE" -ForegroundColor Green
    Write-Host ""
    Write-Host "📚 Documentación:" -ForegroundColor Cyan
    Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor Gray
    Write-Host "  • API Docs: http://localhost:8000/docs" -ForegroundColor Gray
    Write-Host "  • MLflow: http://localhost:5000" -ForegroundColor Gray
} else {
    Write-Host "❌ SE ENCONTRARON $ERRORS PROBLEMAS" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solución:" -ForegroundColor Yellow
    Write-Host "  1. Ejecuta: docker compose up -d" -ForegroundColor Gray
    Write-Host "  2. Espera 30 segundos para que los servicios inicien" -ForegroundColor Gray
    Write-Host "  3. Ejecuta nuevamente este script" -ForegroundColor Gray
}
