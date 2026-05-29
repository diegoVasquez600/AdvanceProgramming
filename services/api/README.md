# API Service (Proxy-Safe Inference)

FastAPI service to run inference with selectable model.

## Endpoints

- `GET /health`
- `GET /models`
- `GET /model/info`
- `POST /predict`
- `GET /predictions`

## Behavior

- Supports model selection: `random_forest` or `svm_rbf`
- Rejects proxy columns in payload with HTTP 400
- Rejects unknown feature names with HTTP 400

## Run

```bash
pip install -r services/api/requirements.txt
uvicorn services.api.src.eva_api.main:app --reload --host 0.0.0.0 --port 8000
```
