# 📦 EVA Platform - Setup Docker Hub

**Tu proyecto EVA está listo para ser deployable en Docker Hub bajo el usuario `diegovasquez600`.**

---

## ✅ Lo que hemos preparado

### 1. 🔨 Scripts de construcción y push

Dos scripts automatizados para construir y subir todas las imágenes a Docker Hub:

- **Linux/macOS**: [`scripts/build-and-push-docker.sh`](./scripts/build-and-push-docker.sh)
  ```bash
  chmod +x scripts/build-and-push-docker.sh
  ./scripts/build-and-push-docker.sh 1.0.0
  ```

- **Windows (PowerShell)**: [`scripts/build-and-push-docker.ps1`](./scripts/build-and-push-docker.ps1)
  ```powershell
  .\scripts\build-and-push-docker.ps1 -Version 1.0.0
  ```

### 2. 📚 Documentación

- **[QUICKSTART.md](./QUICKSTART.md)** - Inicia en 5 minutos ⚡
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía completa de deployment 📖
- **[.env.example](./.env.example)** - Plantilla de configuración

### 3. 🐳 Docker Compose para producción

- **[docker-compose.prod.yml](./docker-compose.prod.yml)** - Usa imágenes desde Docker Hub
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

### 4. 🏥 Scripts de verificación

- **Health Check Linux/macOS**: [`scripts/health-check.sh`](./scripts/health-check.sh)
- **Health Check Windows**: [`scripts/health-check.ps1`](./scripts/health-check.ps1)

---

## 🚀 Pasos para subir a Docker Hub

### Paso 1: Login en Docker Hub

```bash
docker login
```

Ingresa:
- **Username**: `diegovasquez600`
- **Password**: Tu contraseña de Docker Hub

### Paso 2: Construir y subir imágenes

**Opción A - Windows (PowerShell):**
```powershell
.\scripts\build-and-push-docker.ps1 -Version 1.0.0
```

**Opción B - Linux/macOS:**
```bash
chmod +x scripts/build-and-push-docker.sh
./scripts/build-and-push-docker.sh 1.0.0
```

### Paso 3: Verificar en Docker Hub

Accede a: https://hub.docker.com/u/diegovasquez600

Deberías ver 4 repositorios:
- ✅ `eva-api`
- ✅ `eva-frontend`
- ✅ `eva-trainer`
- ✅ `eva-mlflow`

---

## 📊 Imágenes generadas

Una vez subidas, estarán disponibles:

```
docker.io/diegovasquez600/eva-api:1.0.0          (500 MB)
docker.io/diegovasquez600/eva-api:latest

docker.io/diegovasquez600/eva-frontend:1.0.0     (50 MB)
docker.io/diegovasquez600/eva-frontend:latest

docker.io/diegovasquez600/eva-trainer:1.0.0      (600 MB)
docker.io/diegovasquez600/eva-trainer:latest

docker.io/diegovasquez600/eva-mlflow:1.0.0       (300 MB)
docker.io/diegovasquez600/eva-mlflow:latest
```

---

## 🌐 Iniciar desde Docker Hub

Una vez subidas, cualquiera puede iniciar la plataforma:

```bash
# Clonar repo
git clone https://github.com/tu-usuario/AdvanceProgramming.git
cd AdvanceProgramming

# Copiar configuración
cp .env.example .env

# Iniciar desde Docker Hub
docker compose -f docker-compose.prod.yml up -d

# Verificar
docker compose ps
```

---

## 📋 Checklist

- [ ] **Ejecutar**: `docker login`
- [ ] **Ejecutar script**: `.\scripts\build-and-push-docker.ps1 -Version 1.0.0`
- [ ] **Esperar**: ~5-10 minutos (depende de tu conexión)
- [ ] **Verificar**: https://hub.docker.com/u/diegovasquez600
- [ ] **Probar**: `docker compose -f docker-compose.prod.yml up -d`
- [ ] **Acceder**: http://localhost:3000

---

## 🔒 Configuración de seguridad recomendada

Para producción, edita `.env`:

```env
# Cambiar contraseñas
POSTGRES_PASSWORD=TuPasswordSegura123!
MINIO_ROOT_PASSWORD=TuMinioPwd456!

# Configurar puertos públicos
API_PORT=8000
FRONTEND_PORT=3000
```

---

## 📝 Próximos pasos

1. **Commit en Git**
   ```bash
   git add .
   git commit -m "feat: Add Docker Hub deployment setup"
   git push origin main
   ```

2. **Crear tags en GitHub**
   ```bash
   git tag -a v1.0.0 -m "Release EVA Platform v1.0.0"
   git push origin v1.0.0
   ```

3. **Crear release en GitHub**
   - Ir a https://github.com/tu-usuario/AdvanceProgramming/releases
   - Nuevo release → v1.0.0
   - Descripción: Link a Docker Hub images

---

## 📞 Soporte

- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- **Deployment Full**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Docker Hub**: https://hub.docker.com/u/diegovasquez600
- **GitHub**: Tu repositorio

---

## 🎯 Beneficios de este setup

✅ **Una línea**: `docker compose -f docker-compose.prod.yml up -d`

✅ **Multi-plataforma**: Windows, macOS, Linux

✅ **Escalable**: Fácil agregar más versiones (1.0.0, 1.1.0, 2.0.0, etc.)

✅ **Reproducible**: Mismo entorno en local, staging y producción

✅ **CI/CD ready**: Listo para GitHub Actions, GitLab CI, etc.

✅ **Público**: Cualquiera puede descargar y ejecutar

---

**Made with ❤️ by Copilot + diegovasquez600**

Versión: Mayo 2026
