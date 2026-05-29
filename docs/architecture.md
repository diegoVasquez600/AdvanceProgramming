# Arquitectura - EVA Agro Analytics

## Resumen
Plataforma de ML en microservicios para inferencia y trazabilidad sobre EVA.

Servicios en Docker Compose:

1. `db` (PostgreSQL): persistencia de predicciones y backend de MLflow.
2. `object-store` (MinIO): almacenamiento de artefactos.
3. `mlflow`: tracking de experimentos y artefactos.
4. `trainer`: job one-shot para entrenamiento y export de artefactos.
5. `api`: FastAPI con endpoints versionados `/api/v1`.
6. `frontend`: SPA React servida por Nginx.

## Flujo end-to-end

1. `trainer` carga datos EVA y entrena `random_forest` y `logistic_regression`.
2. Exporta `schema.json`, `metrics.json`, `feature_schema.json` y `model_metadata.json` a `artifacts/models`.
3. Registra runs y artefactos en MLflow.
4. `api` carga artefactos y expone inferencia/versionado/trazabilidad.
5. `frontend` consume `/api/v1` para presentación, predicción y servicios.

## Endpoints principales

1. `GET /api/v1/health`
2. `GET /api/v1/models`
3. `GET /api/v1/model/info`
4. `GET /api/v1/schema/input`
5. `POST /api/v1/predict`
6. `GET /api/v1/predictions`

## Persistencia

1. PostgreSQL: tabla `predictions` con `model_name`, `model_version`, `api_version`, `prediction`, `features_json`, timestamps.
2. MinIO: artifacts de MLflow.
3. Volumen local `artifacts/models`: artefactos para inferencia en API.

## Consideraciones operativas

1. `trainer` y `object-store-init` terminan en `Exited` por diseño.
2. `api`, `frontend`, `db`, `mlflow`, `object-store` quedan en `Up`.
3. API puede devolver errores tempranos si se consulta antes de `Application startup complete`.
