# Runbook Operativo - EVA Agro Analytics

## 1. Configuracion inicial

1. Copiar `.env.example` a `.env`.
2. Ajustar credenciales para entorno de demo/produccion.

## 2. Arranque

```powershell
docker compose up -d --build
```

## 3. Estado esperado

```powershell
docker compose ps
```

Esperado:

1. `db` healthy.
2. `mlflow` healthy.
3. `object-store` up.
4. `api` up (healthy).
5. `frontend` up (healthy).
6. `trainer` exited.

## 4. Smoke test API

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\mlops\scripts\smoke_api.ps1
```

Linux/macOS:

```bash
bash ./mlops/scripts/smoke_api.sh
```

## 5. Reentrenar modelos

```powershell
docker compose run --rm trainer
```

## 6. URLs de demo

1. Frontend: `http://localhost:3000`
2. Presentacion: `http://localhost:3000/presentation`
3. Prediccion: `http://localhost:3000/prediccion`
4. Servicios/API: `http://localhost:3000/servicios`
5. Swagger: `http://localhost:8000/docs`
6. ReDoc: `http://localhost:8000/redoc`
7. MLflow: `http://localhost:5000`
8. MinIO Console: `http://localhost:9001`

## 7. Apagado

```powershell
docker compose down
```

Reset completo (incluye volumenes):

```powershell
docker compose down -v
```
