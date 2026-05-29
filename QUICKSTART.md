# 🚀 EVA Platform - Quick Start with Docker Hub

**Inicia la plataforma completa en menos de 5 minutos usando imágenes desde Docker Hub.**

## ⚡ Inicio rápido (Localhost)

### 1️⃣ Requisitos
- Docker 20.10+
- Docker Compose 2.0+

### 2️⃣ Clonar y configurar

```bash
# Clonar repositorio
git clone https://github.com/diegovasquez600/AdvanceProgramming.git
cd AdvanceProgramming

# Copiar configuración
cp .env.example .env
```

### 3️⃣ Iniciar servicios

**Opción A: Construir localmente**
```bash
docker compose up -d
```

**Opción B: Descargar desde Docker Hub (más rápido después)**
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4️⃣ Verificar que todo funciona

```bash
# Ver estado de servicios
docker compose ps

# Probar endpoints
curl http://localhost:3000         # Frontend (React)
curl http://localhost:8000/api/v1/health  # API (FastAPI)
curl http://localhost:5000         # MLflow
```

### 5️⃣ Acceder a la plataforma

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Frontend** | http://localhost:3000 | — |
| **API Docs** | http://localhost:8000/docs | — |
| **MLflow** | http://localhost:5000 | — |
| **MinIO** | http://localhost:9001 | `minioadmin` / `minioadmin` |
| **pgAdmin** | — | Configure según necesidad |

---

## 📊 Visualizar logs

```bash
# Todos los servicios
docker compose logs -f

# Un servicio específico
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f trainer
```

---

## 🛑 Detener servicios

```bash
# Detener sin eliminar volúmenes
docker compose down

# Detener y eliminar volúmenes (limpia base de datos)
docker compose down -v
```

---

## 📦 Imágenes disponibles en Docker Hub

```
diegovasquez600/eva-api:latest          # API FastAPI
diegovasquez600/eva-frontend:latest     # Frontend React
diegovasquez600/eva-trainer:latest      # ML Trainer
diegovasquez600/eva-mlflow:latest       # MLflow Server
```

Todas también tienen tags versionados: `:1.0.0`, `:2.0.0`, etc.

---

## 🔧 Configuración personalizada

Editar `.env` para cambiar:

```env
# Puertos
API_PORT=8000
FRONTEND_PORT=3000
MLFLOW_PORT=5000

# Credenciales (⚠️ cambiar en producción)
POSTGRES_PASSWORD=tu_contraseña_segura
MINIO_ROOT_PASSWORD=tu_contraseña_segura

# Dataset
EVA_MAX_ROWS=12000
```

Luego reiniciar:
```bash
docker compose down
docker compose up -d
```

---

## 📚 Documentación completa

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía completa de deployment
- [README.md](./README.md) - Documentación del proyecto
- [docs/architecture.md](./docs/architecture.md) - Arquitectura del sistema

---

## ❌ Solución de problemas comunes

### Error: "Port already in use"
```bash
# Cambiar puerto en .env
API_PORT=8001
docker compose up -d
```

### Error: "Cannot connect to Docker daemon"
```bash
# Iniciar Docker
# Windows: Abrir Docker Desktop
# Linux: sudo systemctl start docker
```

### Servicios no inician
```bash
# Ver logs de error
docker compose logs
docker compose logs api

# Reiniciar
docker compose restart
```

---

## 🌐 Deployment en servidor

Ver [DEPLOYMENT.md - Deployment desde Docker Hub](./DEPLOYMENT.md#-deployment-desde-docker-hub)

---

## 📝 Próximos pasos

- [ ] Revisar [Documentación API](http://localhost:8000/docs)
- [ ] Cargar dataset y ejecutar modelo
- [ ] Explorar predicciones en Frontend
- [ ] Monitorear con MLflow

---

**Made with ❤️ by diegovasquez600**
