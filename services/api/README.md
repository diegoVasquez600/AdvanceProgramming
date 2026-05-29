# API Service (Proxy-Safe Inference)

FastAPI service for EVA inference, model governance, and prediction traceability.

## Base paths

- Main API: `/api/v1/*`
- Legacy aliases without `/api/v1` are kept for compatibility in selected routes.

## Core endpoints

- `GET /api/v1/health`
- `GET /api/v1/models`
- `GET /api/v1/model/info`
- `GET /api/v1/schema/input`
- `POST /api/v1/predict`
- `GET /api/v1/predictions?limit=100&offset=0`

## Pipeline endpoints

- `GET /api/v1/pipeline/status`
- `POST /api/v1/pipeline/reload-artifacts`

## Governance endpoints

- `GET /api/v1/models/registry?limit=100&offset=0`
- `POST /api/v1/predictions/{prediction_id}/feedback`
- `GET /api/v1/predictions/feedback?limit=100&offset=0`
- `GET /api/v1/predictions/feedback/metrics`
- `GET /api/v1/predictions/feedback/export.csv`

## Docs endpoints

- Swagger UI: `/docs`
- ReDoc: `/redoc`

## Behavior

- Supports model selection: `random_forest` or `logistic_regression`
- Rejects proxy columns in payload with HTTP 400
- Rejects unknown feature names with HTTP 400
- Persists predictions in PostgreSQL
- Tracks model versions and request metadata (`model_registry`, `prediction_requests`)
- Supports feedback loop with observed metrics and CSV export

## Local run (without Docker)

```bash
pip install -r services/api/requirements.txt
uvicorn services.api.src.eva_api.main:app --reload --host 0.0.0.0 --port 8000
```

## Recommended run (Docker Compose)

From repository root:

```bash
docker compose up -d --build
```
