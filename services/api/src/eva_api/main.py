import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import psycopg2
from fastapi import FastAPI, HTTPException

from .schemas import PredictRequest, PredictResponse


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


models_dir = resolve_models_dir()

schema = json.loads((models_dir / "schema.json").read_text(encoding="utf-8"))
metrics = json.loads((models_dir / "metrics.json").read_text(encoding="utf-8"))

loaded_models: dict[str, Any] = {}
for model_name in schema["model_options"]:
    model_path = models_dir / f"{model_name}.joblib"
    if model_path.exists():
        loaded_models[model_name] = joblib.load(model_path)

if not loaded_models:
    raise RuntimeError("No trained models found in artifacts/models")

app = FastAPI(title="EVA Proxy-Safe Inference API", version="0.1.0")


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
                    prediction TEXT NOT NULL,
                    features_json JSONB NOT NULL
                );
                """
            )


def save_prediction(model_name: str, prediction: str, features: dict[str, Any]) -> None:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO predictions (model_name, prediction, features_json)
                VALUES (%s, %s, %s::jsonb)
                """,
                (model_name, prediction, json.dumps(features)),
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/models")
def models() -> dict[str, Any]:
    return {
        "default_model": schema["default_model"],
        "available_models": list(loaded_models.keys()),
        "metrics": metrics,
    }


@app.get("/model/info")
def model_info() -> dict[str, Any]:
    default_model = schema["default_model"]
    return {
        "default_model": default_model,
        "default_model_metrics": metrics.get(default_model, {}),
        "allowed_features_count": len(schema["allowed_features"]),
        "blocked_proxy_columns": schema["blocked_proxy_columns"],
    }


@app.get("/predictions")
def predictions() -> dict[str, Any]:
    dsn = get_db_dsn()
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, created_at, model_name, prediction, features_json
                FROM predictions
                ORDER BY id DESC
                LIMIT 100
                """
            )
            rows = cur.fetchall()

    items = [
        {
            "id": r[0],
            "timestamp": r[1].isoformat(),
            "model_name": r[2],
            "prediction": r[3],
            "features": r[4],
        }
        for r in rows
    ]

    return {"count": len(items), "items": items}


@app.post("/predict", response_model=PredictResponse)
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
    save_prediction(model_name, prediction, row)

    return PredictResponse(
        model_name=model_name,
        prediction=prediction,
        blocked_proxy_columns=schema["blocked_proxy_columns"],
    )
