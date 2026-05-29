# 🚀 Guía de Deployment en Docker Hub

Esta guía explica cómo construir, subir y desplegar la plataforma EVA usando Docker Hub.

## 📋 Tabla de contenidos

1. [Requisitos previos](#requisitos-previos)
2. [Construcción local](#construcción-local)
3. [Subida a Docker Hub](#subida-a-docker-hub)
4. [Deployment desde Docker Hub](#deployment-desde-docker-hub)
5. [Configuración de producción](#configuración-de-producción)
6. [Solución de problemas](#solución-de-problemas)

---

## 📦 Requisitos previos

### Software requerido
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git** (para clonar el repositorio)

### Cuenta de Docker Hub
- Registrarse en [hub.docker.com](https://hub.docker.com)
- Username: `diegovasquez600` (o tu usuario personal)

### Verificación de instalación

```bash
docker --version
docker compose version
docker login
```

---

## 🔨 Construcción local

### Opción 1: Construcción individual

Construye cada imagen manualmente:

```bash
# API
docker build -f services/api/Dockerfile -t diegovasquez600/eva-api:1.0.0 .

# Frontend
docker build -f apps/frontend/Dockerfile -t diegovasquez600/eva-frontend:1.0.0 .

# Trainer
docker build -f services/trainer/Dockerfile -t diegovasquez600/eva-trainer:1.0.0 .

# MLflow
docker build -f mlops/mlflow/Dockerfile -t diegovasquez600/eva-mlflow:1.0.0 .
```

### Opción 2: Script automatizado (Recomendado)

#### En Linux/macOS:

```bash
chmod +x scripts/build-and-push-docker.sh
./scripts/build-and-push-docker.sh 1.0.0
```

#### En Windows (PowerShell):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\build-and-push-docker.ps1 -Version 1.0.0 -DockerHubUser diegovasquez600
```

---

## 📤 Subida a Docker Hub

### Paso 1: Login en Docker Hub

```bash
docker login
```

Ingresa tu username y password cuando se solicite.

### Paso 2: Verificar imágenes construidas

```bash
docker images | grep eva-
```

Deberías ver algo como:

```
diegovasquez600/eva-api          1.0.0    abc123...   500MB
diegovasquez600/eva-frontend     1.0.0    def456...   50MB
diegovasquez600/eva-trainer      1.0.0    ghi789...   600MB
diegovasquez600/eva-mlflow       1.0.0    jkl012...   300MB
```

### Paso 3: Subir imágenes a Docker Hub

#### Opción A: Usando el script (Automático)

El script `build-and-push-docker.ps1` o `.sh` ya incluye el push automático.

#### Opción B: Manual

```bash
# Subir cada imagen
docker push diegovasquez600/eva-api:1.0.0
docker push diegovasquez600/eva-api:latest

docker push diegovasquez600/eva-frontend:1.0.0
docker push diegovasquez600/eva-frontend:latest

docker push diegovasquez600/eva-trainer:1.0.0
docker push diegovasquez600/eva-trainer:latest

docker push diegovasquez600/eva-mlflow:1.0.0
docker push diegovasquez600/eva-mlflow:latest
```

### Paso 4: Verificar en Docker Hub

Accede a https://hub.docker.com/r/diegovasquez600 y verifica que tus imágenes aparezcan en los "Repositories".

---

## 🌐 Deployment desde Docker Hub

### Opción 1: Localhost (Desarrollo)

```bash
# Clonar o navegar al repositorio
git clone https://github.com/tu-usuario/AdvanceProgramming.git
cd AdvanceProgramming

# Copiar archivo de configuración
cp .env.example .env

# Iniciar con docker-compose local (construye localmente)
docker compose up -d

# O iniciar con docker-compose.prod.yml (descarga desde Docker Hub)
docker compose -f docker-compose.prod.yml up -d
```

### Opción 2: Servidor remoto (Producción)

```bash
# En tu servidor
ssh usuario@tu-servidor.com

# Instalar Docker y Docker Compose
# (ver guía oficial de Docker para tu SO)

# Clonar repositorio
git clone https://github.com/tu-usuario/AdvanceProgramming.git
cd AdvanceProgramming

# Copiar y configurar .env
cp .env.example .env
nano .env  # Editar según tus necesidades

# Iniciar servicios
docker compose -f docker-compose.prod.yml up -d

# Verificar estado
docker compose ps
```

### Paso de verificación

```bash
# Ver logs
docker compose logs -f

# Verificar salud de servicios
docker compose ps

# Probar endpoints
curl http://localhost:3000       # Frontend
curl http://localhost:8000/api/v1/health  # API
curl http://localhost:5000      # MLflow
```

---

## ⚙️ Configuración de producción

### Archivo `.env`

Copia `.env.example` a `.env` y personaliza según necesidades:

```bash
cp .env.example .env
```

#### Variables principales

```env
# Base de datos
POSTGRES_DB=mlplatform
POSTGRES_USER=mluser
POSTGRES_PASSWORD=MiPassword123!  # ⚠️ Cambiar en producción

# MinIO (Object Storage)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=MiMinioPwd123!  # ⚠️ Cambiar en producción

# ML Pipeline
EVA_MAX_ROWS=12000
EVA_MLFLOW_EXPERIMENT_NAME=eva_proxy_safe

# Puertos (opcional, editar si necesitas otros puertos)
DB_PORT=5432
API_PORT=8000
FRONTEND_PORT=3000
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MLFLOW_PORT=5000

# Docker Hub
DOCKER_HUB_USER=diegovasquez600
```

### Configuración de seguridad

#### Cambiar contraseñas por defecto

```bash
# Generar passwords seguros
openssl rand -base64 32
```

Actualiza en `.env`:
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`

#### Configurar reverse proxy (NGINX)

Crear `/etc/nginx/conf.d/eva-proxy.conf`:

```nginx
upstream eva_api {
    server api:8000;
}

upstream eva_frontend {
    server frontend:80;
}

upstream eva_mlflow {
    server mlflow:5000;
}

server {
    listen 80;
    server_name tu-dominio.com;

    # Redirigir HTTP a HTTPS en producción
    # return 301 https://$server_name$request_uri;

    location /api/ {
        proxy_pass http://eva_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /mlflow/ {
        proxy_pass http://eva_mlflow;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://eva_frontend;
        proxy_set_header Host $host;
    }
}
```

---

## 🐛 Solución de problemas

### Problema: "No estás loggeado en Docker Hub"

```bash
# Solución
docker login
# Ingresa credenciales
```

### Problema: Imágenes grandes tardan en descargar

```bash
# Ver progreso de descarga
docker compose -f docker-compose.prod.yml pull

# O usar un registry privado más cercano
```

### Problema: Puerto ya está en uso

```bash
# Verificar qué servicio ocupa el puerto
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# O cambiar puerto en .env
API_PORT=8001
```

### Problema: Base de datos no inicia

```bash
# Eliminar volúmenes y reintentar
docker compose down -v
docker compose -f docker-compose.prod.yml up -d

# Ver logs
docker compose logs db
```

### Problema: API no conecta a la base de datos

```bash
# Verificar variables de entorno
docker compose config | grep DB_

# Revisar logs del API
docker compose logs api

# Verificar conectividad
docker compose exec api python -c "import psycopg2; print('OK')"
```

---

## 📚 Referencias

- [Docker Documentation](https://docs.docker.com)
- [Docker Hub](https://hub.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Repositorio EVA](https://github.com/diegovasquez600/AdvanceProgramming)

---

## 🔗 Enlazes útiles

- **Mi Docker Hub**: https://hub.docker.com/u/diegovasquez600
- **Imágenes EVA**: https://hub.docker.com/r/diegovasquez600/eva-api

---

## ❓ Soporte

Para problemas o preguntas:
1. Revisar logs: `docker compose logs`
2. Consultar [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Abrir issue en [GitHub](https://github.com/tu-usuario/AdvanceProgramming/issues)

---

**Última actualización:** Mayo 2026
