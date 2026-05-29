import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC

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
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    df = load_and_clean(csv_path)

    drop_proxy = [c for c in PROXY_COLUMNS if c in df.columns]
    model_df = df.drop(columns=drop_proxy, errors="ignore").copy()

    if TARGET_COLUMN not in model_df.columns:
        raise ValueError(f"Missing target column: {TARGET_COLUMN}")

    y = model_df[TARGET_COLUMN]
    X = model_df.drop(columns=[TARGET_COLUMN])

    num_cols = X.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = X.select_dtypes(include=["object", "string"]).columns.tolist()

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
        "svm_rbf": Pipeline(
            [
                ("preprocessor", pre),
                ("svd", TruncatedSVD(n_components=40, random_state=42)),
                ("scaler_dense", StandardScaler()),
                (
                    "model",
                    SVC(kernel="rbf", C=3.0, gamma="scale", class_weight="balanced"),
                ),
            ]
        ),
    }

    metrics = {}

    for name, pipe in models.items():
        pipe.fit(X_train, y_train)
        pred = pipe.predict(X_test)
        metrics[name] = evaluate(y_test, pred)
        joblib.dump(pipe, artifacts_dir / f"{name}.joblib")

    schema = {
        "target_column": TARGET_COLUMN,
        "allowed_features": list(X.columns),
        "blocked_proxy_columns": drop_proxy,
        "model_options": list(models.keys()),
        "default_model": "random_forest",
    }

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

    print("Training complete. Artifacts generated at:")
    print(artifacts_dir)
    print(metrics_df)


if __name__ == "__main__":
    main()
