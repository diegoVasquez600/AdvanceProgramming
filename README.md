# Notebooks de Programación Avanzada

Este repositorio contiene dos notebooks desarrollados para la asignatura **Programación Avanzada**. El primero corresponde a un análisis exploratorio del dataset **Evaluaciones Agropecuarias Municipales (EVA)** de Colombia y el segundo resuelve el **Taller 1 de Álgebra Lineal para Machine Learning**.

> **🐳 Ahora con deployment en Docker Hub público** 
> 
> La plataforma EVA completa está disponible como imágenes Docker en [diegovasquez600/eva-*](https://hub.docker.com/u/diegovasquez600)
> 
> ⚡ **Quick Start**: 
> ```bash
> git clone https://github.com/diegovasquez600/AdvanceProgramming.git
> cd AdvanceProgramming && cp .env.example .env
> docker compose -f docker-compose.prod.yml up -d
> ```
> 
> Ver [QUICKSTART.md](./QUICKSTART.md) o [DOCKER_HUB_SETUP.md](./DOCKER_HUB_SETUP.md) para más detalles.

## Contenido del repositorio

- `notebooks/exploratory/Exploratory_Data_Analysis_Colombia_EVA.ipynb`: análisis exploratorio, limpieza, estandarización y preparación de datos del dataset EVA para modelado.
- `notebooks/archived/Taller1_ProgramacionAvanzada_Diego_Rios.ipynb`: desarrollo del Taller 1 con ejercicios de vectores, transformaciones lineales y PCA.
- `notebooks/modeling/Modelado_Clasificacion_Multiclase_Colombia_EVA.ipynb`: modelado base de clasificación multiclase.
- `notebooks/modeling/Modelado_Clasificacion_Multiclase_Colombia_EVA_PROXY_SAFE.ipynb`: modelado proxy-safe alineado con la API.
- `notebooks/evidences/Informe_Evidencias_Proxy_Safe.ipynb`: evidencias y resultados del enfoque proxy-safe.

El proyecto está configurado para:

- Usar primero el archivo CSV local completo en `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv`.
- Usar la API de Datos Abiertos (`datos.gov.co`) como respaldo si el CSV no está disponible.

## 1. Requisitos

- Python 3.10 o superior (recomendado)
- `pip` actualizado
- VS Code con extensiones de Python/Jupyter o Jupyter Notebook/Lab

## 2. Instalación

### Windows (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

## 3. Verificación rápida

Ejecuta este comando para validar dependencias:

```bash
python -c "import pandas, numpy, matplotlib, seaborn, scipy, sodapy, dotenv; print('OK: dependencias instaladas')"
```

## 4. Ejecución de los notebooks

1. Activa el entorno virtual (`.venv`).
2. Abre el proyecto en VS Code.
3. Abre el notebook que desees ejecutar.
4. Selecciona el kernel de `.venv`.
5. Ejecuta todas las celdas en orden.

### Notebook 1: EDA del dataset EVA

Archivo:

- `notebooks/exploratory/Exploratory_Data_Analysis_Colombia_EVA.ipynb`

Este notebook usa como fuente principal el CSV completo ubicado en `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv` y, si no está disponible, usa la API de Datos Abiertos como respaldo.

### Notebook 2: Taller 1 de Programación Avanzada

Archivo:

- `notebooks/archived/Taller1_ProgramacionAvanzada_Diego_Rios.ipynb`

Este notebook no depende de la API de Datos Abiertos. Contiene ejercicios académicos de álgebra lineal aplicados a machine learning, incluyendo similitud coseno, transformaciones lineales sobre imágenes y análisis PCA.

## 5. Fuente de datos

### Opción recomendada (por defecto): CSV local completo

El notebook intentará cargar automáticamente:

- `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv`

Si el archivo existe, se usa como fuente principal y se estandarizan los encabezados para mantener compatibilidad con el esquema del análisis.

### Opción de respaldo: API de Datos Abiertos

Si falla la carga del CSV, el notebook consulta la API Socrata de `datos.gov.co`.

Variables usadas:

- `DOMAIN = datos.gov.co`
- `DATASET_ID = 2pnw-mmge`

## 6. Variables de entorno (opcional, recomendado para API)

Puedes definir credenciales en un archivo `.env` en la raíz del proyecto:

```env
DATOSABIERTOS_API_KEY=tu_api_key
DATOSABIERTOS_API_SECRET=tu_api_secret
DATOSABIERTOS_APP_TOKEN=tu_app_token
```

Notas:

- Si no defines `DATOSABIERTOS_APP_TOKEN`, el notebook intenta usar `DATOSABIERTOS_API_KEY` como token.
- Si no hay credenciales, puede funcionar en modo público con límites de tasa.

## 7. Solución de problemas comunes

### Error de importación de paquetes

```bash
python -m pip install --upgrade pip setuptools wheel
pip install --no-cache-dir -r requirements.txt
```

### Kernel incorrecto en VS Code

- Abre el selector de kernel en el notebook.
- Elige el intérprete de `.venv`.

### El notebook no encuentra el CSV

Verifica que exista exactamente esta ruta relativa:

- `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv`

### Se usa API y da error de autenticación

- Revisa variables `.env`.
- Valida token en `datos.gov.co`.
- Reintenta en modo público (sin token) o usa el CSV local.

## 8. Estructura del proyecto

```text
AdvanceProgramming/
|-- data/
|   `-- Evaluaciones_Agropecuarias_Municipales_EVA.csv
|-- notebooks/
|   |-- exploratory/
|   |   `-- Exploratory_Data_Analysis_Colombia_EVA.ipynb
|   |-- modeling/
|   |   |-- Modelado_Clasificacion_Multiclase_Colombia_EVA.ipynb
|   |   `-- Modelado_Clasificacion_Multiclase_Colombia_EVA_PROXY_SAFE.ipynb
|   |-- evidences/
|   |   `-- Informe_Evidencias_Proxy_Safe.ipynb
|   `-- archived/
|       `-- Taller1_ProgramacionAvanzada_Diego_Rios.ipynb
|-- requirements.txt
|-- README.md
`-- .gitignore
```

## 9. Recomendación de uso

Si el objetivo es revisar el trabajo de análisis de datos, comienza por `notebooks/exploratory/Exploratory_Data_Analysis_Colombia_EVA.ipynb`. Si el objetivo es revisar el desarrollo del taller académico de álgebra lineal, abre `notebooks/archived/Taller1_ProgramacionAvanzada_Diego_Rios.ipynb`.

## 10. Runbook de demo estable (Docker full-stack)

Estado estable validado en clase/local (29-05-2026):

- `db` (PostgreSQL)
- `object-store` + `object-store-init` (MinIO)
- `mlflow` (tracking server)
- `trainer` (job one-shot, termina en `Exited` cuando finaliza)
- `api` (FastAPI inferencia + persistencia en PostgreSQL)
- `frontend` (Nginx + UI de demo)

### 10.1 Prerrequisitos

- Docker Desktop activo
- Puertos libres: `3000`, `5000`, `5432`, `8000`, `9000`, `9001`

Configurar variables de entorno antes de levantar:

```bash
cp .env.example .env
```

Luego ajustar credenciales/parametros en `.env` si se requiere.

### 10.2 Arranque exacto (Bash recomendado)

Desde la raiz del proyecto:

```bash
docker compose up -d --build
```

Opcion recomendada para clase (despliegue + validacion automatica end-to-end):

```bash
bash ./mlops/scripts/deploy_and_validate.sh
```

Nota importante:

- Es esperado que `trainer` quede en `Exited` al terminar (no es error).
- `object-store-init` tambien termina en `Exited` tras crear buckets.

### 10.3 Verificacion de estado de contenedores

```bash
docker compose ps
```

Estado esperado:

- `db`: `Up (healthy)`
- `mlflow`: `Up (healthy)`
- `object-store`: `Up`
- `api`: `Up (healthy)`
- `frontend`: `Up (healthy)`
- `trainer`: `Exited (0)`

### 10.4 Pruebas de salud HTTP

```bash
curl -sS http://localhost:8000/api/v1/health
curl -sS http://localhost:8000/api/v1/models
curl -sS http://localhost:8000/api/v1/pipeline/status
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:5000
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8000/docs
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8000/redoc
```

Resultado esperado minimo:

- `/api/v1/health` retorna `{"status":"ok"}`
- `/api/v1/models` lista `random_forest` y `logistic_regression`
- `/api/v1/pipeline/status` muestra estado de artefactos cargados
- Frontend responde `200`
- MLflow responde `200`
- Swagger UI (`/docs`) responde `200`
- ReDoc (`/redoc`) responde `200`

Nota: ReDoc se sirve con bundle local dentro del contenedor `api` para evitar dependencia de CDN en tiempo de ejecucion.

Adicional: ReDoc incluye diagramas embebidos (DB y clases de la API) servidos localmente en `/static-docs/diagrams/*` para presentacion en clase sin depender de Internet.

Governance v2 agregado:

- `GET /api/v1/models/registry`
- `POST /api/v1/predictions/{prediction_id}/feedback`
- `GET /api/v1/predictions/feedback`
- `GET /api/v1/predictions/feedback/metrics`
- `GET /api/v1/predictions/feedback/export.csv`

Migracion SQL versionada disponible en `mlops/migrations/001_governance_schema.sql`.

### 10.5 Prueba E2E de prediccion + persistencia

```bash
payload='{"model_name":"random_forest","features":{"c_d_dep":5,"departamento":"Antioquia","c_d_mun":1,"municipio":"Medellin","grupo_de_cultivo":"Cereales","a_o":2023,"periodo":"A","rea_sembrada_ha":10.5,"rea_cosechada_ha":10.1,"producci_n_t":43.0,"rendimiento_t_ha":4.2}}'

curl -sS -X POST -H "Content-Type: application/json" -d "$payload" http://localhost:8000/api/v1/predict
curl -sS http://localhost:8000/api/v1/predictions
curl -sS -X POST http://localhost:8000/api/v1/pipeline/reload-artifacts
```

Resultado esperado:

- `/predict` responde con `model_name`, `prediction` y `blocked_proxy_columns`.
- `/predictions` incrementa `count` y muestra el registro insertado.

### 10.6 Smoke test automatizado de API (opcional)

Linux/macOS/Git Bash (recomendado):

```bash
bash ./mlops/scripts/smoke_api.sh
```

Windows PowerShell (opcional):

```powershell
powershell -ExecutionPolicy Bypass -File .\mlops\scripts\smoke_api.ps1
```

### 10.7 Reiniciar entrenamiento (si se requiere nueva corrida)

```bash
docker compose run --rm trainer
```

### 10.8 Apagado

Detener servicios manteniendo datos:

```bash
docker compose down
```

Detener y limpiar volumenes (reset completo local):

```bash
docker compose down -v
```

### 10.9 Troubleshooting corto

Si `mlflow` falla al iniciar con `ModuleNotFoundError: pkg_resources`:

1. Reconstruir sin cache la imagen de `mlflow`.
2. Volver a levantar stack.

```bash
docker compose build --no-cache mlflow
docker compose up -d
```

## 11. Documentacion tecnica

- Arquitectura: `docs/architecture.md`
- Runbook operativo: `docs/runbook.md`

## 12. Rutas de demo frontend

- Presentacion: `http://localhost:3000/presentation`
- Prediccion: `http://localhost:3000/prediccion`
- Servicios/API: `http://localhost:3000/servicios`