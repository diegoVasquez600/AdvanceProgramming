import json
import os
import time
import uuid
import csv
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import psycopg2
from fastapi import FastAPI, HTTPException, Query
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_redoc_html
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .schemas import (
    HealthResponse,
    InputSchemaResponse,
    ModelArtifactInfo,
    ModelRegistryItem,
    ModelRegistryResponse,
    ModelMetadataResponse,
    ModelsResponse,
    FeedbackMetricsResponse,
    PipelineReloadResponse,
    PipelineStatusResponse,
    FeedbackMetricItem,
    PredictionFeedbackItem,
    PredictionFeedbackListResponse,
    PredictionFeedbackRequest,
    PredictionFeedbackResponse,
    PredictRequest,
    PredictionItem,
    PredictionsResponse,
    PredictResponse,
)

API_VERSION = "v1"
OPENAPI_VERSION = "3.0.3"

API_DESCRIPTION = """
Plataforma de inferencia ML para EVA Agro Analytics con trazabilidad completa de predicciones.

## Objetivo academico
Esta API demuestra un flujo real de microservicios para entrenamiento, despliegue y consumo de modelos.

## Flujo de negocio
1. `trainer` genera artefactos (`*.joblib`, `schema.json`, `metrics.json`, `model_metadata.json`).
2. `api` carga artefactos y valida payloads proxy-safe.
3. `api` persiste inferencias en PostgreSQL para auditoria.
4. `frontend` consume contratos versionados en `/api/v1`.

## Diagrama de base de datos (PostgreSQL)
![Diagrama DB](/static-docs/diagrams/db-governance-schema.svg)

## Diagrama de clases (DTOs y respuestas)
![Diagrama de clases API](/static-docs/diagrams/api-class-governance-diagram.svg)

## Convenciones
- Endpoints versionados: `/api/v1/*`
- Endpoints legacy no versionados: compatibles pero ocultos en esquema
- Prediccion proxy-safe: columnas bloqueadas se rechazan con `400`
"""


def find_project_root(start: Path) -> Path:
    candidates = [start] + list(start.parents)
    for c in candidates:
        if (c / "artifacts" / "models" / "schema.json").exists():
            return c
    raise FileNotFoundError("artifacts/models/schema.json not found")


def resolve_models_dir() -> Path:
    env_dir = os.getenv("EVA_MODELS_DIR")
    if env_dir:
        return Path(env_dir)

    project_root = find_project_root(Path(__file__).resolve())
    return project_root / "artifacts" / "models"


def read_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def infer_feature_schema(current_schema: dict[str, Any]) -> dict[str, Any]:
    numeric_hints = {
        "c_d_dep",
        "c_d_mun",
        "a_o",
        "rea_sembrada_ha",
        "rea_cosechada_ha",
        "producci_n_t",
        "rendimiento_t_ha",
    }
    features = []
    for col in current_schema["allowed_features"]:
        kind = "number" if col in numeric_hints else "string"
        example = 1 if kind == "number" else "valor"
        features.append(
            {
                "name": col,
                "type": kind,
                "nullable": True,
                "example": example,
                "description": f"Feature {col}",
            }
        )
    return {
        "target_column": current_schema["target_column"],
        "required_features": current_schema["allowed_features"],
        "features": features,
    }


models_dir = resolve_models_dir()

tracking_uri = os.getenv("EVA_MLFLOW_TRACKING_URI", "http://mlflow:5000")
experiment_name = os.getenv("EVA_MLFLOW_EXPERIMENT_NAME", "eva_proxy_safe")

schema: dict[str, Any] = {}
metrics: dict[str, Any] = {}
feature_schema: dict[str, Any] = {}
model_metadata: dict[str, Any] = {}
loaded_models: dict[str, Any] = {}
last_artifacts_reload_at = "unknown"


def load_artifacts() -> list[str]:
    global schema
    global metrics
    global feature_schema
    global model_metadata
    global loaded_models
    global last_artifacts_reload_at

    current_schema = json.loads(
        (models_dir / "schema.json").read_text(encoding="utf-8")
    )
    current_metrics = json.loads(
        (models_dir / "metrics.json").read_text(encoding="utf-8")
    )
    current_feature_schema = read_optional_json(
        models_dir / "feature_schema.json"
    ) or infer_feature_schema(current_schema)
    current_model_metadata = read_optional_json(models_dir / "model_metadata.json")

    current_models: dict[str, Any] = {}
    for model_name in current_schema["model_options"]:
        model_path = models_dir / f"{model_name}.joblib"
        if model_path.exists():
            current_models[model_name] = joblib.load(model_path)

    if not current_models:
        raise RuntimeError("No trained models found in artifacts/models")

    schema = current_schema
    metrics = current_metrics
    feature_schema = current_feature_schema
    model_metadata = current_model_metadata
    loaded_models = current_models
    last_artifacts_reload_at = datetime.now(timezone.utc).isoformat()
    return list(current_models.keys())


load_artifacts()

tags_metadata = [
    {
        "name": "health",
        "description": "Liveness/readiness para orquestacion y smoke checks.",
    },
    {
        "name": "models",
        "description": "Catalogo de modelos cargados, metricas y metadata de artefactos.",
    },
    {
        "name": "schema",
        "description": "Contrato de entrada para formularios dinamicos y validacion de payload.",
    },
    {
        "name": "predictions",
        "description": "Inferencia online y trazabilidad historica persistida en PostgreSQL.",
    },
    {
        "name": "pipeline",
        "description": "Operaciones del pipeline para inspeccion y recarga de artefactos.",
    },
    {
        "name": "governance",
        "description": "Trazabilidad de versiones de modelo y feedback de predicciones.",
    },
]

app = FastAPI(
    title="EVA Agro Analytics API",
    version=API_VERSION,
    description=API_DESCRIPTION,
    openapi_tags=tags_metadata,
    openapi_version=OPENAPI_VERSION,
    contact={
        "name": "EVA Agro Analytics Team",
    },
    redoc_url=None,
)

docs_static_dir = Path(__file__).resolve().parent / "static"
app.mount(
    "/static-docs", StaticFiles(directory=str(docs_static_dir)), name="static-docs"
)


def custom_openapi() -> dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=OPENAPI_VERSION,
        description=app.description,
        routes=app.routes,
        tags=tags_metadata,
    )

    openapi_schema["info"]["x-logo"] = {
        "url": "/static-docs/diagrams/eva-logo-badge.svg",
        "altText": "EVA Agro Analytics",
        "backgroundColor": "#f4f5f7",
    }
    openapi_schema["x-tagGroups"] = [
        {"name": "Core", "tags": ["health", "models", "schema", "predictions"]},
        {"name": "Operations", "tags": ["pipeline", "governance"]},
    ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


def get_db_dsn() -> str:
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME", "mlplatform")
    user = os.getenv("DB_USER", "mluser")
    password = os.getenv("DB_PASSWORD", "mlpass")
    return f"host={host} port={port} dbname={dbname} user={user} password={password}"


def create_predictions_table() -> None:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS predictions (
                    id BIGSERIAL PRIMARY KEY,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    model_name TEXT NOT NULL,
                    model_version TEXT NOT NULL DEFAULT 'unknown',
                    api_version TEXT NOT NULL DEFAULT 'v1',
                    prediction TEXT NOT NULL,
                    features_json JSONB NOT NULL
                );
                """
            )
            cur.execute(
                "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT 'unknown'"
            )
            cur.execute(
                "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS api_version TEXT NOT NULL DEFAULT 'v1'"
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS model_registry (
                    id BIGSERIAL PRIMARY KEY,
                    model_name TEXT NOT NULL,
                    model_version TEXT NOT NULL,
                    artifact_path TEXT NOT NULL,
                    experiment_name TEXT,
                    training_timestamp TEXT,
                    metrics_json JSONB NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (model_name, model_version)
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS prediction_requests (
                    id BIGSERIAL PRIMARY KEY,
                    prediction_id BIGINT UNIQUE NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
                    request_id TEXT UNIQUE NOT NULL,
                    model_registry_id BIGINT NOT NULL REFERENCES model_registry(id),
                    api_version TEXT NOT NULL DEFAULT 'v1',
                    status_code INTEGER NOT NULL,
                    latency_ms INTEGER NOT NULL,
                    error_message TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS prediction_feedback (
                    id BIGSERIAL PRIMARY KEY,
                    prediction_id BIGINT UNIQUE NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
                    true_label TEXT NOT NULL,
                    source TEXT NOT NULL DEFAULT 'manual',
                    notes TEXT,
                    labeled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_prediction_requests_created_at ON prediction_requests(created_at DESC)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_prediction_feedback_labeled_at ON prediction_feedback(labeled_at DESC)"
            )


def upsert_model_registry_record(
    cur: psycopg2.extensions.cursor,
    model_name: str,
    model_version: str,
) -> int:
    model_path = models_dir / f"{model_name}.joblib"
    metadata_item = model_metadata.get("models", {}).get(model_name, {})
    training_timestamp = metadata_item.get("trained_at")
    if not training_timestamp and model_path.exists():
        training_timestamp = datetime.fromtimestamp(
            model_path.stat().st_mtime, tz=timezone.utc
        ).isoformat()

    metrics_payload = metrics.get(model_name, {})
    cur.execute(
        """
        INSERT INTO model_registry (
            model_name,
            model_version,
            artifact_path,
            experiment_name,
            training_timestamp,
            metrics_json,
            is_active
        )
        VALUES (%s, %s, %s, %s, %s, %s::jsonb, TRUE)
        ON CONFLICT (model_name, model_version)
        DO UPDATE SET
            artifact_path = EXCLUDED.artifact_path,
            experiment_name = EXCLUDED.experiment_name,
            training_timestamp = EXCLUDED.training_timestamp,
            metrics_json = EXCLUDED.metrics_json,
            is_active = TRUE
        RETURNING id
        """,
        (
            model_name,
            model_version,
            model_path.name,
            model_metadata.get("experiment_name"),
            str(training_timestamp or "unknown"),
            json.dumps(metrics_payload),
        ),
    )
    return int(cur.fetchone()[0])


def sync_model_registry() -> None:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            for model_name in loaded_models:
                version = model_version_for(model_name)
                upsert_model_registry_record(cur, model_name, version)


def model_version_for(model_name: str) -> str:
    metadata_model = model_metadata.get("models", {}).get(model_name, {})
    if metadata_model.get("version"):
        return str(metadata_model["version"])

    model_path = models_dir / f"{model_name}.joblib"
    if model_path.exists():
        return datetime.fromtimestamp(
            model_path.stat().st_mtime, tz=timezone.utc
        ).isoformat()
    return "unknown"


def save_prediction(
    model_name: str,
    model_version: str,
    prediction: str,
    features: dict[str, Any],
    latency_ms: int,
) -> tuple[int, str]:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            model_registry_id = upsert_model_registry_record(
                cur, model_name, model_version
            )
            cur.execute(
                """
                INSERT INTO predictions (model_name, model_version, api_version, prediction, features_json)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                RETURNING id, created_at
                """,
                (
                    model_name,
                    model_version,
                    API_VERSION,
                    prediction,
                    json.dumps(features),
                ),
            )
            row = cur.fetchone()
            prediction_id = int(row[0])
            timestamp = row[1].isoformat()

            cur.execute(
                """
                INSERT INTO prediction_requests (
                    prediction_id,
                    request_id,
                    model_registry_id,
                    api_version,
                    status_code,
                    latency_ms,
                    error_message
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    prediction_id,
                    str(uuid.uuid4()),
                    model_registry_id,
                    API_VERSION,
                    200,
                    max(0, latency_ms),
                    None,
                ),
            )

            return prediction_id, timestamp


def normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    return max(1, min(limit, 500)), max(0, offset)


def get_predictions(limit: int = 100, offset: int = 0) -> PredictionsResponse:
    limit, offset = normalize_pagination(limit, offset)
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, created_at, model_name, model_version, api_version, prediction, features_json
                FROM predictions
                ORDER BY id DESC
                LIMIT %s
                OFFSET %s
                """,
                (limit, offset),
            )
            rows = cur.fetchall()

    items = [
        PredictionItem(
            id=r[0],
            timestamp=r[1].isoformat(),
            model_name=r[2],
            model_version=r[3],
            api_version=r[4],
            prediction=r[5],
            features=r[6],
        )
        for r in rows
    ]
    return PredictionsResponse(count=len(items), items=items)


def get_model_registry(limit: int = 100, offset: int = 0) -> ModelRegistryResponse:
    limit, offset = normalize_pagination(limit, offset)
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    model_name,
                    model_version,
                    artifact_path,
                    experiment_name,
                    training_timestamp,
                    metrics_json,
                    is_active,
                    deployed_at
                FROM model_registry
                ORDER BY deployed_at DESC, id DESC
                LIMIT %s
                OFFSET %s
                """,
                (limit, offset),
            )
            rows = cur.fetchall()

    items = [
        ModelRegistryItem(
            id=r[0],
            model_name=r[1],
            model_version=r[2],
            artifact_path=r[3],
            experiment_name=r[4],
            training_timestamp=r[5],
            metrics=r[6],
            is_active=r[7],
            deployed_at=r[8].isoformat(),
        )
        for r in rows
    ]
    return ModelRegistryResponse(count=len(items), items=items)


def save_prediction_feedback(
    prediction_id: int,
    payload: PredictionFeedbackRequest,
) -> PredictionFeedbackResponse:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM predictions WHERE id = %s",
                (prediction_id,),
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=f"prediction_id {prediction_id} not found",
                )

            cur.execute(
                """
                INSERT INTO prediction_feedback (prediction_id, true_label, source, notes)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (prediction_id)
                DO UPDATE SET
                    true_label = EXCLUDED.true_label,
                    source = EXCLUDED.source,
                    notes = EXCLUDED.notes,
                    labeled_at = NOW()
                RETURNING id, prediction_id, true_label, source, notes, labeled_at
                """,
                (
                    prediction_id,
                    payload.true_label,
                    payload.source,
                    payload.notes,
                ),
            )
            row = cur.fetchone()

    item = PredictionFeedbackItem(
        id=row[0],
        prediction_id=row[1],
        true_label=row[2],
        source=row[3],
        notes=row[4],
        labeled_at=row[5].isoformat(),
    )
    return PredictionFeedbackResponse(status="ok", item=item)


def list_prediction_feedback(
    limit: int = 100, offset: int = 0
) -> PredictionFeedbackListResponse:
    limit, offset = normalize_pagination(limit, offset)
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, prediction_id, true_label, source, notes, labeled_at
                FROM prediction_feedback
                ORDER BY labeled_at DESC
                LIMIT %s
                OFFSET %s
                """,
                (limit, offset),
            )
            rows = cur.fetchall()

    items = [
        PredictionFeedbackItem(
            id=r[0],
            prediction_id=r[1],
            true_label=r[2],
            source=r[3],
            notes=r[4],
            labeled_at=r[5].isoformat(),
        )
        for r in rows
    ]
    return PredictionFeedbackListResponse(count=len(items), items=items)


def get_feedback_metrics() -> FeedbackMetricsResponse:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.model_name,
                    p.model_version,
                    COUNT(*) AS labeled_count,
                    SUM(CASE WHEN p.prediction = f.true_label THEN 1 ELSE 0 END) AS exact_match_count,
                    AVG(CASE WHEN p.prediction = f.true_label THEN 1.0 ELSE 0.0 END) AS observed_accuracy
                FROM prediction_feedback f
                INNER JOIN predictions p ON p.id = f.prediction_id
                GROUP BY p.model_name, p.model_version
                ORDER BY labeled_count DESC, p.model_name ASC
                """
            )
            rows = cur.fetchall()

    items = [
        FeedbackMetricItem(
            model_name=r[0],
            model_version=r[1],
            labeled_count=int(r[2]),
            exact_match_count=int(r[3]),
            observed_accuracy=float(r[4] or 0.0),
        )
        for r in rows
    ]
    return FeedbackMetricsResponse(count=len(items), items=items)


def export_feedback_csv() -> str:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    f.prediction_id,
                    p.model_name,
                    p.model_version,
                    p.prediction,
                    f.true_label,
                    f.source,
                    f.notes,
                    f.labeled_at
                FROM prediction_feedback f
                INNER JOIN predictions p ON p.id = f.prediction_id
                ORDER BY f.labeled_at DESC
                """
            )
            rows = cur.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "prediction_id",
            "model_name",
            "model_version",
            "prediction",
            "true_label",
            "source",
            "notes",
            "labeled_at",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row[0],
                row[1],
                row[2],
                row[3],
                row[4],
                row[5],
                row[6] or "",
                row[7].isoformat(),
            ]
        )
    return output.getvalue()


def get_models_response() -> ModelsResponse:
    return ModelsResponse(
        default_model=schema["default_model"],
        available_models=list(loaded_models.keys()),
        metrics=metrics,
    )


def get_input_schema_response() -> InputSchemaResponse:
    return InputSchemaResponse(
        target_column=schema["target_column"],
        blocked_proxy_columns=schema["blocked_proxy_columns"],
        required_features=feature_schema.get(
            "required_features", schema["allowed_features"]
        ),
        features=feature_schema.get("features", []),
    )


def get_metadata_response() -> ModelMetadataResponse:
    metadata_models = model_metadata.get("models", {})
    items: list[ModelArtifactInfo] = []
    for model_name in loaded_models:
        model_path = models_dir / f"{model_name}.joblib"
        metadata_item = metadata_models.get(model_name, {})
        trained_at = metadata_item.get("trained_at")
        if not trained_at and model_path.exists():
            trained_at = datetime.fromtimestamp(
                model_path.stat().st_mtime, tz=timezone.utc
            ).isoformat()

        items.append(
            ModelArtifactInfo(
                model_name=model_name,
                version=str(
                    metadata_item.get("version", model_version_for(model_name))
                ),
                trained_at=str(trained_at or "unknown"),
                artifact_path=str(model_path.name),
                metrics=metrics[model_name],
            )
        )

    return ModelMetadataResponse(
        api_version=API_VERSION,
        default_model=schema["default_model"],
        experiment_name=model_metadata.get("experiment_name"),
        training_timestamp=model_metadata.get("training_timestamp"),
        models=items,
    )


def get_pipeline_status_response() -> PipelineStatusResponse:
    files = sorted(
        [p.name for p in models_dir.glob("*.json")]
        + [p.name for p in models_dir.glob("*.joblib")]
    )
    return PipelineStatusResponse(
        api_version=API_VERSION,
        tracking_uri=tracking_uri,
        experiment_name=experiment_name,
        models_dir=str(models_dir),
        loaded_models=sorted(list(loaded_models.keys())),
        available_artifact_files=files,
        last_artifacts_reload_at=last_artifacts_reload_at,
    )


@app.on_event("startup")
def startup_event() -> None:
    # DB can come up after the API container; retry briefly before failing.
    last_error: Exception | None = None
    for _ in range(20):
        try:
            create_predictions_table()
            sync_model_registry()
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(1)
    raise RuntimeError(f"Could not initialize DB table: {last_error}")


@app.get("/redoc", include_in_schema=False)
def redoc_html() -> HTMLResponse:
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - ReDoc",
        redoc_js_url="/static-docs/redoc.standalone.js",
        with_google_fonts=False,
    )


@app.get(
    "/api/v1/pipeline/status",
    response_model=PipelineStatusResponse,
    tags=["pipeline"],
    summary="Pipeline runtime status",
    description=(
        "Expone el estado operativo del pipeline de inferencia: modelos cargados, "
        "artefactos disponibles y timestamp de la ultima recarga."
    ),
)
def pipeline_status() -> PipelineStatusResponse:
    return get_pipeline_status_response()


@app.post(
    "/api/v1/pipeline/reload-artifacts",
    response_model=PipelineReloadResponse,
    tags=["pipeline"],
    summary="Reload model artifacts after retraining",
    description=(
        "Recarga artefactos desde el directorio de modelos sin reiniciar el contenedor API. "
        "Usar despues de ejecutar `docker compose run --rm trainer`."
    ),
)
def pipeline_reload_artifacts() -> PipelineReloadResponse:
    reloaded = load_artifacts()
    sync_model_registry()
    return PipelineReloadResponse(
        status="ok",
        message="Artifacts reloaded from models directory",
        reloaded_models=reloaded,
        reloaded_at=last_artifacts_reload_at,
    )


@app.get(
    "/api/v1/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Health check",
    description="Endpoint de verificacion rapida para liveness/readiness.",
)
@app.get("/health", response_model=HealthResponse, include_in_schema=False)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get(
    "/api/v1/models",
    response_model=ModelsResponse,
    tags=["models"],
    summary="List available models",
    description="Lista el modelo por defecto, modelos disponibles y metricas comparativas.",
)
@app.get("/models", response_model=ModelsResponse, include_in_schema=False)
def models() -> ModelsResponse:
    return get_models_response()


@app.get(
    "/api/v1/model/info",
    response_model=ModelMetadataResponse,
    tags=["models"],
    summary="Model metadata and metrics",
    description=(
        "Devuelve metadata expandida por artefacto: version, fecha de entrenamiento, "
        "ruta de artefacto y metricas."
    ),
)
@app.get("/model/info", response_model=ModelMetadataResponse, include_in_schema=False)
def model_info() -> ModelMetadataResponse:
    return get_metadata_response()


@app.get(
    "/api/v1/schema/input",
    response_model=InputSchemaResponse,
    tags=["schema"],
    summary="Input schema for dynamic frontend forms",
    description=(
        "Contrato oficial de entrada para el endpoint de prediccion, incluyendo "
        "features requeridas y columnas proxy bloqueadas."
    ),
)
def input_schema() -> InputSchemaResponse:
    return get_input_schema_response()


@app.get(
    "/api/v1/predictions",
    response_model=PredictionsResponse,
    tags=["predictions"],
    summary="Prediction history with traceability",
    description=(
        "Retorna el historial de inferencias persistidas (maximo 100) con metadata "
        "de version del modelo y payload de features."
    ),
)
@app.get("/predictions", response_model=PredictionsResponse, include_in_schema=False)
def predictions(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> PredictionsResponse:
    return get_predictions(limit=limit, offset=offset)


@app.get(
    "/api/v1/models/registry",
    response_model=ModelRegistryResponse,
    tags=["governance"],
    summary="Model registry history",
    description=(
        "Lista las versiones de modelo registradas para trazabilidad operacional "
        "(version, metadata y metricas)."
    ),
)
def models_registry(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> ModelRegistryResponse:
    return get_model_registry(limit=limit, offset=offset)


@app.post(
    "/api/v1/predictions/{prediction_id}/feedback",
    response_model=PredictionFeedbackResponse,
    tags=["governance"],
    summary="Attach or update ground-truth feedback",
    description=(
        "Asocia etiqueta real (ground truth) a una prediccion para analisis posterior "
        "de calidad de modelo."
    ),
)
def predictions_feedback(
    prediction_id: int,
    payload: PredictionFeedbackRequest,
) -> PredictionFeedbackResponse:
    return save_prediction_feedback(prediction_id, payload)


@app.get(
    "/api/v1/predictions/feedback",
    response_model=PredictionFeedbackListResponse,
    tags=["governance"],
    summary="List recent prediction feedback",
    description="Consulta las etiquetas reales registradas para predicciones.",
)
def predictions_feedback_list(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> PredictionFeedbackListResponse:
    return list_prediction_feedback(limit=limit, offset=offset)


@app.get(
    "/api/v1/predictions/feedback/metrics",
    response_model=FeedbackMetricsResponse,
    tags=["governance"],
    summary="Aggregate observed feedback metrics",
    description=(
        "Calcula metricas observadas sobre feedback etiquetado (match exacto y accuracy) "
        "agregadas por modelo/version."
    ),
)
def predictions_feedback_metrics() -> FeedbackMetricsResponse:
    return get_feedback_metrics()


@app.get(
    "/api/v1/predictions/feedback/export.csv",
    response_class=PlainTextResponse,
    tags=["governance"],
    summary="Export prediction feedback as CSV",
    description="Exporta feedback etiquetado a CSV para analisis externo.",
)
def predictions_feedback_export_csv() -> PlainTextResponse:
    csv_data = export_feedback_csv()
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=prediction_feedback.csv"},
    )


@app.post(
    "/api/v1/predict",
    response_model=PredictResponse,
    tags=["predictions"],
    summary="Run proxy-safe prediction",
    description=(
        "Ejecuta una prediccion usando `random_forest` o `logistic_regression`. "
        "Valida columnas bloqueadas y features desconocidas antes de inferir."
    ),
    responses={
        400: {
            "description": "Invalid model, blocked proxy columns, or unknown features",
            "content": {
                "application/json": {
                    "examples": {
                        "proxy_columns": {
                            "summary": "Blocked proxy feature",
                            "value": {
                                "detail": {
                                    "message": "Proxy columns are not allowed in payload",
                                    "blocked_proxy_columns": ["cultivo"],
                                }
                            },
                        },
                        "unknown_columns": {
                            "summary": "Unknown feature",
                            "value": {
                                "detail": {
                                    "message": "Unknown features in payload",
                                    "unknown_features": ["foo"],
                                }
                            },
                        },
                    }
                }
            },
        }
    },
)
@app.post("/predict", response_model=PredictResponse, include_in_schema=False)
def predict(payload: PredictRequest) -> PredictResponse:
    start = time.perf_counter()
    model_name = payload.model_name or schema["default_model"]
    if model_name not in loaded_models:
        raise HTTPException(status_code=400, detail=f"Invalid model_name: {model_name}")

    blocked = [
        c for c in payload.features.keys() if c in schema["blocked_proxy_columns"]
    ]
    if blocked:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Proxy columns are not allowed in payload",
                "blocked_proxy_columns": blocked,
            },
        )

    unknown = [
        c for c in payload.features.keys() if c not in schema["allowed_features"]
    ]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Unknown features in payload",
                "unknown_features": unknown,
            },
        )

    row = {k: payload.features.get(k, None) for k in schema["allowed_features"]}
    X = pd.DataFrame([row])

    prediction = str(loaded_models[model_name].predict(X)[0])
    model_version = model_version_for(model_name)
    latency_ms = int((time.perf_counter() - start) * 1000)
    prediction_id, timestamp = save_prediction(
        model_name, model_version, prediction, row, latency_ms
    )

    return PredictResponse(
        prediction_id=prediction_id,
        timestamp=timestamp,
        model_name=model_name,
        model_version=model_version,
        api_version=API_VERSION,
        prediction=prediction,
        blocked_proxy_columns=schema["blocked_proxy_columns"],
    )
