import json
import os
from pathlib import Path

import mlflow
import mlflow.sklearn
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .config import PROXY_COLUMNS, TARGET_COLUMN, find_project_root
from .data import load_and_clean


def build_preprocessor(num_cols: list[str], cat_cols: list[str]) -> ColumnTransformer:
    num_pipe = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    cat_pipe = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=True)),
        ]
    )
    return ColumnTransformer(
        [
            ("num", num_pipe, num_cols),
            ("cat", cat_pipe, cat_cols),
        ]
    )


def evaluate(y_true, y_pred) -> dict:
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(
            precision_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "recall_macro": float(
            recall_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
    }


def main() -> None:
    project_root = find_project_root(Path(__file__).resolve())
    csv_path = project_root / "data" / "Evaluaciones_Agropecuarias_Municipales_EVA.csv"
    artifacts_dir = project_root / "artifacts" / "models"
    mlruns_dir = project_root / "mlruns"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    mlruns_dir.mkdir(parents=True, exist_ok=True)

    tracking_uri = os.getenv(
        "EVA_MLFLOW_TRACKING_URI", f"file://{mlruns_dir.as_posix()}"
    )
    experiment_name = os.getenv("EVA_MLFLOW_EXPERIMENT_NAME", "eva_proxy_safe")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)

    df = load_and_clean(csv_path)

    # Keeps training feasible for local/dev runs while preserving class ratios.
    max_rows = int(os.getenv("EVA_MAX_ROWS", "12000"))
    if len(df) > max_rows:
        frac = max_rows / len(df)
        df = (
            df.groupby(TARGET_COLUMN, group_keys=False)
            .sample(frac=frac, random_state=42)
            .reset_index(drop=True)
        )

    drop_proxy = [c for c in PROXY_COLUMNS if c in df.columns]
    model_df = df.drop(columns=drop_proxy, errors="ignore").copy()

    if TARGET_COLUMN not in model_df.columns:
        raise ValueError(f"Missing target column: {TARGET_COLUMN}")

    y = model_df[TARGET_COLUMN]
    X = model_df.drop(columns=[TARGET_COLUMN])

    num_cols = X.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = X.select_dtypes(include=["object", "string"]).columns.tolist()

    schema = {
        "target_column": TARGET_COLUMN,
        "allowed_features": list(X.columns),
        "blocked_proxy_columns": drop_proxy,
        "model_options": ["random_forest", "logistic_regression"],
        "default_model": "random_forest",
    }

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pre = build_preprocessor(num_cols, cat_cols)

    models = {
        "random_forest": Pipeline(
            [
                ("preprocessor", pre),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=320,
                        random_state=42,
                        n_jobs=-1,
                        class_weight="balanced_subsample",
                    ),
                ),
            ]
        ),
        "logistic_regression": Pipeline(
            [
                ("preprocessor", pre),
                (
                    "model",
                    LogisticRegression(
                        max_iter=1500,
                        solver="saga",
                        n_jobs=-1,
                        class_weight="balanced",
                        multi_class="auto",
                    ),
                ),
            ]
        ),
    }

    metrics = {}

    with mlflow.start_run(run_name="training_summary"):
        mlflow.log_param("target_column", TARGET_COLUMN)
        mlflow.log_param("rows_used", len(df))
        mlflow.log_param("train_rows", len(X_train))
        mlflow.log_param("test_rows", len(X_test))
        mlflow.log_param("blocked_proxy_columns_count", len(drop_proxy))
        mlflow.log_dict(schema, "schema.json")

        for name, pipe in models.items():
            with mlflow.start_run(run_name=name, nested=True):
                pipe.fit(X_train, y_train)
                pred = pipe.predict(X_test)
                metrics[name] = evaluate(y_test, pred)

                joblib_path = artifacts_dir / f"{name}.joblib"
                joblib.dump(pipe, joblib_path)

                mlflow.log_param("model_name", name)
                mlflow.log_param("target_column", TARGET_COLUMN)
                for metric_name, metric_value in metrics[name].items():
                    mlflow.log_metric(metric_name, metric_value)

                mlflow.log_dict(metrics[name], f"metrics_{name}.json")
                mlflow.log_artifact(str(joblib_path), artifact_path="models")
                mlflow.sklearn.log_model(pipe, artifact_path="sklearn-model")

    (artifacts_dir / "schema.json").write_text(
        json.dumps(schema, indent=2), encoding="utf-8"
    )
    (artifacts_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )

    # Keep baseline stats for documentation and quick checks.
    metrics_df = (
        pd.DataFrame.from_dict(metrics, orient="index")
        .reset_index()
        .rename(columns={"index": "model"})
    )
    metrics_df.to_csv(artifacts_dir / "metrics.csv", index=False)
    with mlflow.start_run(run_name="artifacts_summary"):
        mlflow.log_artifact(str(artifacts_dir / "metrics.csv"), artifact_path="reports")
        mlflow.log_artifact(str(artifacts_dir / "schema.json"), artifact_path="reports")
        mlflow.log_artifact(
            str(artifacts_dir / "metrics.json"), artifact_path="reports"
        )

    print("Training complete. Artifacts generated at:")
    print(artifacts_dir)
    print(f"MLflow tracking URI: {tracking_uri}")
    print(f"MLflow experiment: {experiment_name}")
    print(f"Rows used for training: {len(df):,}")
    print(metrics_df)


if __name__ == "__main__":
    main()
