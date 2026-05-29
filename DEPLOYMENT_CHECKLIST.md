# 🎯 Checklist - Deployment a Docker Hub

Sigue estos pasos para llevar tu plataforma EVA a Docker Hub público.

---

## ✅ Fase 1: Preparación (Ya completada)

- [x] **Scripts de construcción**
  - [x] `scripts/build-and-push-docker.ps1` (Windows)
  - [x] `scripts/build-and-push-docker.sh` (Linux/macOS)

- [x] **Docker Compose para producción**
  - [x] `docker-compose.prod.yml` (Lee desde Docker Hub)

- [x] **Documentación**
  - [x] `DOCKER_HUB_SETUP.md` (Este setup)
  - [x] `DEPLOYMENT.md` (Guía completa)
  - [x] `QUICKSTART.md` (Inicio rápido)
  - [x] `.env.example` (Plantilla de configuración)

- [x] **Scripts de verificación**
  - [x] `scripts/health-check.ps1` (Windows)
  - [x] `scripts/health-check.sh` (Linux/macOS)

---

## 🔄 Fase 2: Build & Push (A ejecutar)

### 1. Verificar Docker instalado
- [ ] Ejecutar: `docker --version`
- [ ] Ejecutar: `docker compose version`

### 2. Login en Docker Hub
- [ ] Ejecutar: `docker login`
- [ ] Username: `diegovasquez600`
- [ ] Password: *Tu contraseña de Docker Hub*

### 3. Construir imágenes localmente (Opcional - el script lo hace)
- [ ] Esperar a que el script construya todas las imágenes
- [ ] Tiempo estimado: 5-10 minutos dependiendo del internet

### 4. Subir a Docker Hub
**Opción A - Windows (PowerShell):**
```powershell
cd d:\source\repos\AdvanceProgramming
.\scripts\build-and-push-docker.ps1 -Version 1.0.0 -DockerHubUser diegovasquez600
```
- [ ] Script ejecutándose sin errores
- [ ] Todas las imágenes subidas exitosamente

**Opción B - Linux/macOS (Bash):**
```bash
cd ~/AdvanceProgramming
chmod +x scripts/build-and-push-docker.sh
./scripts/build-and-push-docker.sh 1.0.0
```
- [ ] Script ejecutándose sin errores
- [ ] Todas las imágenes subidas exitosamente

### 5. Verificar en Docker Hub
- [ ] Ir a: https://hub.docker.com/u/diegovasquez600
- [ ] Verificar repositorios:
  - [ ] `eva-api` (con tags `1.0.0` y `latest`)
  - [ ] `eva-frontend` (con tags `1.0.0` y `latest`)
  - [ ] `eva-trainer` (con tags `1.0.0` y `latest`)
  - [ ] `eva-mlflow` (con tags `1.0.0` y `latest`)

---

## 🧪 Fase 3: Testing (Verificación)

### 1. Descargar imágenes desde Docker Hub
```bash
docker compose -f docker-compose.prod.yml pull
```
- [ ] Todas las imágenes descargadas correctamente

### 2. Iniciar servicios
```bash
docker compose -f docker-compose.prod.yml up -d
```
- [ ] Comando ejecutado sin errores

### 3. Ejecutar health check
**Windows:**
```powershell
.\scripts\health-check.ps1
```

**Linux/macOS:**
```bash
bash scripts/health-check.sh
```

- [ ] Frontend accesible: http://localhost:3000
- [ ] API accesible: http://localhost:8000/api/v1/health
- [ ] MLflow accesible: http://localhost:5000
- [ ] MinIO accesible: http://localhost:9001

### 4. Verificar estados
```bash
docker compose ps
```
- [ ] Todos los servicios en estado `Up` o `Exited` (trainer)

---

## 📝 Fase 4: Git & Documentación

### 1. Commit cambios
```bash
git add .
git commit -m "feat: Add Docker Hub deployment setup for EVA platform"
```
- [ ] Cambios committeados

### 2. Push a repositorio
```bash
git push origin main
```
- [ ] Cambios pusheados a GitHub/GitLab

### 3. Crear tag de versión
```bash
git tag -a v1.0.0 -m "Release EVA Platform v1.0.0"
git push origin v1.0.0
```
- [ ] Tag creado y pusheado

### 4. Crear release en GitHub
- [ ] Ir a: https://github.com/diegovasquez600/AdvanceProgramming/releases
- [ ] Crear nuevo release
  - [ ] Tag: `v1.0.0`
  - [ ] Título: "EVA Platform v1.0.0 - Docker Hub"
  - [ ] Descripción: Incluir links a Docker Hub
  - [ ] Marcar como "Latest release"

---

## 🚀 Fase 5: Deployment (Producción)

### 1. Servidor remoto - Primer setup
```bash
# En tu servidor
ssh usuario@tu-servidor.com

# Clonar repo
git clone https://github.com/diegovasquez600/AdvanceProgramming.git
cd AdvanceProgramming

# Copiar configuración
cp .env.example .env

# Editar .env con contraseñas seguras
nano .env

# Iniciar
docker compose -f docker-compose.prod.yml up -d
```
- [ ] Servicios iniciados en servidor

### 2. Verificar en servidor
```bash
docker compose ps
curl http://localhost:3000
```
- [ ] Servicios respondiendo correctamente

### 3. Configurar SSL/TLS (Recomendado)
- [ ] Obtener certificado (Let's Encrypt)
- [ ] Configurar Nginx reverse proxy
- [ ] Actualizar URLs en `.env`

---

## 📊 Resumen de Versiones

| Versión | Fecha | Status | Docker Hub |
|---------|-------|--------|-----------|
| v1.0.0  | 29-05-2026 | ✅ Released | [diegovasquez600/eva-*](https://hub.docker.com/u/diegovasquez600) |
| v1.1.0  | TBD | ⏳ Planned | — |
| v2.0.0  | TBD | 📋 Planned | — |

---

## 🎁 Próximas versiones

- [ ] Auto-scaling con Kubernetes
- [ ] CI/CD con GitHub Actions
- [ ] Monitoring con Prometheus
- [ ] Logging centralizado con ELK
- [ ] Backup automático de base de datos
- [ ] Métricas en tiempo real

---

## 📞 Soporte

Si algo no funciona:

1. **Revisar logs**: `docker compose logs -f`
2. **Ejecutar health check**: `.\scripts\health-check.ps1`
3. **Consultar DEPLOYMENT.md**: Sección "Solución de problemas"
4. **Revisar docker stats**: `docker stats`

---

## ✨ ¡Felicidades!

Tu plataforma EVA está ahora:
- ✅ Dockerizada
- ✅ Publicada en Docker Hub
- ✅ Listo para producción
- ✅ Fácil de desplegar

**Comparte con otros:**
```bash
docker pull diegovasquez600/eva-api:latest
```

---

**Última actualización:** 29 de Mayo de 2026
