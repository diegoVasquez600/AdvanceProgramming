import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import psycopg2
from fastapi import FastAPI, HTTPException

from .schemas import (
    HealthResponse,
    InputSchemaResponse,
    ModelArtifactInfo,
    ModelMetadataResponse,
    ModelsResponse,
    PredictRequest,
    PredictionItem,
    PredictionsResponse,
    PredictResponse,
)

API_VERSION = "v1"


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


def infer_feature_schema() -> dict[str, Any]:
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
    for col in schema["allowed_features"]:
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
        "target_column": schema["target_column"],
        "required_features": schema["allowed_features"],
        "features": features,
    }


models_dir = resolve_models_dir()

schema = json.loads((models_dir / "schema.json").read_text(encoding="utf-8"))
metrics = json.loads((models_dir / "metrics.json").read_text(encoding="utf-8"))
feature_schema = (
    read_optional_json(models_dir / "feature_schema.json") or infer_feature_schema()
)
model_metadata = read_optional_json(models_dir / "model_metadata.json")

loaded_models: dict[str, Any] = {}
for model_name in schema["model_options"]:
    model_path = models_dir / f"{model_name}.joblib"
    if model_path.exists():
        loaded_models[model_name] = joblib.load(model_path)

if not loaded_models:
    raise RuntimeError("No trained models found in artifacts/models")

tags_metadata = [
    {"name": "health", "description": "Service liveness and readiness checks."},
    {"name": "models", "description": "Model catalog, metrics, and model metadata."},
    {
        "name": "schema",
        "description": "Input schema contract used by the frontend for dynamic forms.",
    },
    {
        "name": "predictions",
        "description": "Inference and traceable prediction history persisted in PostgreSQL.",
    },
]

app = FastAPI(
    title="EVA Agro Analytics API",
    version=API_VERSION,
    description=(
        "ML inference and tracking API for EVA.\n\n"
        "Primary endpoints follow /api/v1. Legacy non-versioned aliases are kept for compatibility."
    ),
    openapi_tags=tags_metadata,
)


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
) -> tuple[int, str]:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
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
            return int(row[0]), row[1].isoformat()


def get_predictions(limit: int = 100) -> PredictionsResponse:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, created_at, model_name, model_version, api_version, prediction, features_json
                FROM predictions
                ORDER BY id DESC
                LIMIT %s
                """,
                (limit,),
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


@app.on_event("startup")
def startup_event() -> None:
    # DB can come up after the API container; retry briefly before failing.
    last_error: Exception | None = None
    for _ in range(20):
        try:
            create_predictions_table()
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(1)
    raise RuntimeError(f"Could not initialize DB table: {last_error}")


@app.get(
    "/api/v1/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Health check",
)
@app.get("/health", response_model=HealthResponse, include_in_schema=False)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get(
    "/api/v1/models",
    response_model=ModelsResponse,
    tags=["models"],
    summary="List available models",
)
@app.get("/models", response_model=ModelsResponse, include_in_schema=False)
def models() -> ModelsResponse:
    return get_models_response()


@app.get(
    "/api/v1/model/info",
    response_model=ModelMetadataResponse,
    tags=["models"],
    summary="Model metadata and metrics",
)
@app.get("/model/info", response_model=ModelMetadataResponse, include_in_schema=False)
def model_info() -> ModelMetadataResponse:
    return get_metadata_response()


@app.get(
    "/api/v1/schema/input",
    response_model=InputSchemaResponse,
    tags=["schema"],
    summary="Input schema for dynamic frontend forms",
)
def input_schema() -> InputSchemaResponse:
    return get_input_schema_response()


@app.get(
    "/api/v1/predictions",
    response_model=PredictionsResponse,
    tags=["predictions"],
    summary="Prediction history with traceability",
)
@app.get("/predictions", response_model=PredictionsResponse, include_in_schema=False)
def predictions() -> PredictionsResponse:
    return get_predictions(limit=100)


@app.post(
    "/api/v1/predict",
    response_model=PredictResponse,
    tags=["predictions"],
    summary="Run proxy-safe prediction",
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
    prediction_id, timestamp = save_prediction(
        model_name, model_version, prediction, row
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
