# Trainer Service (Proxy-Safe)

This service trains and exports proxy-safe EVA models for inference.

## Models exported

- `random_forest` (main production model)
- `logistic_regression` (simple proxy-safe comparator for generalization)

Both models are trained with proxy columns removed.

## Proxy columns blocked

- cultivo
- subgrupo_de_cultivo
- nombre_cientifico
- estado_fisico_produccion
- desagregaci_n_regional_y

## Run

```bash
pip install -r services/trainer/requirements.txt
python -m services.trainer.src.eva_ml.train
```

## MLflow

By default the trainer logs runs to a local file-based MLflow store at `mlruns/` in the project root.

Optional environment variables:

- `EVA_MLFLOW_TRACKING_URI` to point to another MLflow backend
- `EVA_MLFLOW_EXPERIMENT_NAME` to override the experiment name
- `EVA_MAX_ROWS` to cap the training sample size during local runs

## Artifacts generated

Under `artifacts/models/`:

- `random_forest.joblib`
- `logistic_regression.joblib`
- `schema.json`
- `metrics.json`
- `metrics.csv`
