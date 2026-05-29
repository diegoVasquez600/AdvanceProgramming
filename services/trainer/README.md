# Trainer Service (Proxy-Safe)

This service trains and exports proxy-safe EVA models for inference.

## Models exported

- `random_forest` (main production model)
- `svm_rbf` (recommended alternative baseline to LogisticRegression)

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

## Artifacts generated

Under `artifacts/models/`:

- `random_forest.joblib`
- `svm_rbf.joblib`
- `schema.json`
- `metrics.json`
- `metrics.csv`
