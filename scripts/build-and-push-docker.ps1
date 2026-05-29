# Script para construir y subir imágenes Docker a Docker Hub (PowerShell)
# Uso: .\scripts\build-and-push-docker.ps1 -Version 1.0.0
# Ejemplo: .\scripts\build-and-push-docker.ps1 -Version 1.0.0 -DockerHubUser diegovasquez600

param(
    [string]$Version = "latest",
    [string]$DockerHubUser = "diegovasquez600",
    [string]$Registry = "docker.io"
)

$ErrorActionPreference = "Stop"

Write-Host "🔨 Construyendo y subiendo imágenes Docker para: $DockerHubUser" -ForegroundColor Cyan
Write-Host "📦 Versión: $Version" -ForegroundColor Yellow
Write-Host ""

# Verificar que el usuario haya hecho login en Docker Hub
try {
    $dockerInfo = docker info 2>&1
    if ($dockerInfo -match "ERROR") {
        Write-Host "❌ Error: No estás loggeado en Docker Hub" -ForegroundColor Red
        Write-Host "Ejecuta: docker login" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Error verificando Docker: $_" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker login verificado" -ForegroundColor Green
Write-Host ""

# Array de imágenes a construir
$Images = @(
    @{ Name = "eva-api"; Dockerfile = "services/api/Dockerfile" },
    @{ Name = "eva-frontend"; Dockerfile = "apps/frontend/Dockerfile" },
    @{ Name = "eva-trainer"; Dockerfile = "services/trainer/Dockerfile" },
    @{ Name = "eva-mlflow"; Dockerfile = "mlops/mlflow/Dockerfile" }
)

# Construir y subir cada imagen
foreach ($image in $Images) {
    $imageName = $image.Name
    $dockerfile = $image.Dockerfile
    
    $fullImageName = "$DockerHubUser/$imageName"
    $tagVersioned = "$fullImageName`:$Version"
    $tagLatest = "$fullImageName`:latest"
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "📦 Construyendo: $tagVersioned" -ForegroundColor Cyan
    Write-Host "📄 Dockerfile: $dockerfile" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
    
    try {
        # Construir imagen
        Write-Host "Ejecutando: docker build -f $dockerfile -t $tagVersioned -t $tagLatest ." -ForegroundColor DarkGray
        docker build -f "$dockerfile" -t "$tagVersioned" -t "$tagLatest" .
        
        Write-Host "✅ Construcción exitosa: $tagVersioned" -ForegroundColor Green
        Write-Host ""
        Write-Host "📤 Subiendo a Docker Hub..." -ForegroundColor Cyan
        
        # Subir versión etiquetada
        docker push "$tagVersioned"
        
        # Subir como latest
        docker push "$tagLatest"
        
        Write-Host "✅ Subida completada" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ Error en la construcción de $imageName`: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "✅ ¡Todas las imágenes construidas y subidas exitosamente!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 Imágenes disponibles en Docker Hub:" -ForegroundColor Yellow
Write-Host ""
foreach ($image in $Images) {
    $imageName = $image.Name
    Write-Host "  • $DockerHubUser/$imageName`:$Version" -ForegroundColor Cyan
    Write-Host "  • $DockerHubUser/$imageName`:latest" -ForegroundColor Cyan
}
Write-Host ""
