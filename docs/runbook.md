# Runbook Operativo - EVA Agro Analytics

## 1. Configuracion inicial

1. Copiar `.env.example` a `.env`.
2. Ajustar credenciales para entorno de demo/produccion.

```bash
cp .env.example .env
```

## 2. Arranque

```bash
docker compose up -d --build
```

## 2.1 Despliegue automatico (recomendado)

Script unico para levantar stack, esperar servicios, ejecutar smoke test y validar flujo de demo (pipeline + governance + export CSV):

```bash
bash ./mlops/scripts/deploy_and_validate.sh
```

Variables opcionales:

```bash
BASE_URL=http://127.0.0.1:8000 FRONTEND_URL=http://127.0.0.1:3000 MAX_WAIT_SECONDS=240 bash ./mlops/scripts/deploy_and_validate.sh
```

## 3. Estado esperado

```bash
docker compose ps
```

Esperado:

1. `db` healthy.
2. `mlflow` healthy.
3. `object-store` up.
4. `api` up (healthy).
5. `frontend` up (healthy).
6. `trainer` exited.

## 4. Smoke test API

Linux/macOS/Git Bash (recomendado):

```bash
bash ./mlops/scripts/smoke_api.sh
```

Windows PowerShell (opcional):

```powershell
powershell -ExecutionPolicy Bypass -File .\mlops\scripts\smoke_api.ps1
```

## 5. Reentrenar modelos

```bash
docker compose run --rm trainer

# Recargar artefactos en API despues del entrenamiento
curl -sS -X POST http://localhost:8000/api/v1/pipeline/reload-artifacts
```

## 6. URLs de demo

1. Frontend: `http://localhost:3000`
2. Presentacion: `http://localhost:3000/presentation`
3. Prediccion: `http://localhost:3000/prediccion`
4. Servicios/API: `http://localhost:3000/servicios`
5. Swagger: `http://localhost:8000/docs`
6. ReDoc: `http://localhost:8000/redoc`
7. MLflow: `http://localhost:5000`
8. MinIO Console: `http://localhost:9001`

## 7. Verificacion de pipeline desde API

```bash
curl -sS http://localhost:8000/api/v1/pipeline/status
```

## 8. Verificacion de governance (registry + feedback)

Consultar registro de modelos cargados:

```bash
curl -sS http://localhost:8000/api/v1/models/registry
curl -sS "http://localhost:8000/api/v1/models/registry?limit=20&offset=0"
```

Registrar feedback de una prediccion existente (ejemplo con `prediction_id=1`):

```bash
curl -sS -X POST \
	-H "Content-Type: application/json" \
	-d '{"true_label":"maiz","source":"manual","notes":"etiqueta validada en clase"}' \
	http://localhost:8000/api/v1/predictions/1/feedback

curl -sS http://localhost:8000/api/v1/predictions/feedback
curl -sS http://localhost:8000/api/v1/predictions/feedback/metrics
curl -sS -I http://localhost:8000/api/v1/predictions/feedback/export.csv | head -n 1
```

## 9. Demo guiada en 3 minutos (clase)

1. Ejecutar una prediccion (`POST /api/v1/predict`) y mostrar `prediction_id`.
2. Consultar `GET /api/v1/models/registry` para evidenciar versionado activo de modelos.
3. Registrar etiqueta real via `POST /api/v1/predictions/{prediction_id}/feedback`.
4. Mostrar `GET /api/v1/predictions/feedback/metrics` para cerrar ciclo con accuracy observada.
5. Descargar `GET /api/v1/predictions/feedback/export.csv` como evidencia exportable.

## 10. Verificacion de documentacion enriquecida (ReDoc)

Validar que los assets de diagramas respondan `200`:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8000/static-docs/diagrams/db-governance-schema.svg
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8000/static-docs/diagrams/api-class-governance-diagram.svg
```

En navegador abrir `http://localhost:8000/redoc` y confirmar que se visualizan:

1. Diagrama de base de datos.
2. Diagrama de clases de la API.

## 11. Migracion SQL versionada

Script versionado de esquema governance:

1. `mlops/migrations/001_governance_schema.sql`

Uso manual opcional (si deseas aplicar fuera del startup de API):

```bash
docker compose exec -T db psql -U mluser -d mlplatform -f /dev/stdin < ./mlops/migrations/001_governance_schema.sql
```

## 12. Apagado

```bash
docker compose down
```

Reset completo (incluye volumenes):

```bash
docker compose down -v
```
