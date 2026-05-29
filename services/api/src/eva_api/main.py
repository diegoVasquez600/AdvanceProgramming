import json
from datetime import datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException

from .schemas import PredictRequest, PredictResponse


def find_project_root(start: Path) -> Path:
    candidates = [start] + list(start.parents)
    for c in candidates:
        if (c / "artifacts" / "models" / "schema.json").exists():
            return c
    raise FileNotFoundError("artifacts/models/schema.json not found")


project_root = find_project_root(Path(__file__).resolve())
models_dir = project_root / "artifacts" / "models"

schema = json.loads((models_dir / "schema.json").read_text(encoding="utf-8"))
metrics = json.loads((models_dir / "metrics.json").read_text(encoding="utf-8"))

loaded_models: dict[str, Any] = {}
for model_name in schema["model_options"]:
    model_path = models_dir / f"{model_name}.joblib"
    if model_path.exists():
        loaded_models[model_name] = joblib.load(model_path)

if not loaded_models:
    raise RuntimeError("No trained models found in artifacts/models")

prediction_history: list[dict[str, Any]] = []

app = FastAPI(title="EVA Proxy-Safe Inference API", version="0.1.0")


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
    return {"count": len(prediction_history), "items": prediction_history}


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

    prediction_history.append(
        {
            "timestamp": datetime.utcnow().isoformat(),
            "model_name": model_name,
            "prediction": prediction,
        }
    )

    return PredictResponse(
        model_name=model_name,
        prediction=prediction,
        blocked_proxy_columns=schema["blocked_proxy_columns"],
    )
