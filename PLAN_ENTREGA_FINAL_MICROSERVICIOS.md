# Plan Maestro - Entrega Final (Plataforma de ML en Microservicios)

Fecha: 2026-05-28  
Proyecto base: clasificacion multiclase ciclo de cultivo (EVA Colombia)

## 1) Objetivo del plan

Definir, antes de mover archivos o tocar arquitectura, una ruta clara para:
1. Organizar el repositorio sin romper enlaces en notebooks y reportes.
2. Convertir el trabajo actual en una plataforma de ML desacoplada.
3. Integrar entrenamiento, tracking, despliegue de modelo, API y frontend.
4. Cumplir los requisitos de la entrega final (Docker + Compose + persistencia + endpoint funcional + UI).

## 2) Recomendacion de modelos para la entrega

Con base en el estado actual del proyecto:
1. Modelo principal recomendado: RandomForest (mejor desempeno proxy-safe).
2. Modelo secundario (baseline interpretable): LogisticRegression.
3. No usar KNN como modelo principal para despliegue productivo.

Estrategia recomendada:
1. Publicar RandomForest como modelo activo.
2. Mantener LogisticRegression en MLflow como modelo de respaldo/comparacion.
3. Registrar ambos modelos y sus metricas para trazabilidad en la demo.

## 3) Estructura objetivo del repositorio (propuesta)

```text
AdvanceProgramming/
  apps/
    frontend/                   # UI (React/Vue/Next, segun decidan)
  services/
    api/                        # API REST de inferencia y consulta
    trainer/                    # entrenamiento y registro en MLflow
    data-pipeline/              # ingest, validacion, preprocesamiento batch
  mlops/
    mlflow/                     # configuracion tracking server
    scripts/                    # utilidades de registro/promocion modelo
  notebooks/
    exploratory/
    modeling/
    evidences/
    archived/                   # versiones antiguas que no van a ejecucion
  data/
    raw/
    processed/
  artifacts/
    models/                     # artefactos locales (si aplica)
    predictions/
    reports/
  reports/
    informe_modelado_proxy_safe/
    notebook_evidencias_proxy_safe/
  docs/
    architecture.md
    runbook.md
  docker-compose.yml
  README.md
```

## 4) Plan de migracion de notebooks y reportes (sin romper links)

Regla general: mover en dos fases, con verificacion despues de cada fase.

### Fase A - Reorganizacion segura
1. Crear carpetas destino (`notebooks/*`).
2. Copiar (no mover) notebooks al nuevo destino.
3. Ejecutar smoke test de enlaces en markdown y exportes de notebooks.
4. Verificar que los reportes en `reports/` sigan renderizando imagenes.

### Fase B - Consolidacion
1. Cuando todo funcione, hacer `git mv` de notebooks definitivos.
2. Ajustar rutas relativas solo donde realmente fallen.
3. Re-ejecutar celdas de exporte para confirmar que escriben en rutas correctas.
4. Eliminar duplicados solo al final.

Checklist de integridad de enlaces:
1. `reports/informe_modelado_proxy_safe/INFORME_DETALLADO_PROXY_SAFE.md` abre todas las imagenes `./assets/*.png`.
2. Los CSV vinculados en el informe existen.
3. Los notebooks pueden leer `data/...` y escribir en `reports/...` sin cambios manuales.
4. Ningun notebook depende de rutas absolutas de Windows.

## 5) Arquitectura de microservicios propuesta

Servicios minimos en `docker-compose`:
1. `frontend`: interfaz para prediccion y consulta de estado.
2. `api`: REST para inferencia, healthcheck y consulta de metricas/modelo.
3. `trainer`: servicio o job para entrenamiento y registro en MLflow.
4. `mlflow`: tracking server y registry.
5. `db`: PostgreSQL para metadatos (API y MLflow backend).
6. `object-store`: MinIO para artefactos de modelos y archivos grandes.

Persistencia minima requerida:
1. Dataset procesado.
2. Modelos entrenados/versionados.
3. Metricas de entrenamiento.
4. Predicciones solicitadas por API.

## 6) Flujo funcional de ML (alineado a la rubrica)

1. Ingestion:
- Cargar dataset EVA desde `data/raw`.

2. Preprocesamiento:
- Aplicar limpieza y politica proxy-safe.
- Generar dataset listo en `data/processed`.

3. Entrenamiento:
- Entrenar RandomForest y LogisticRegression.
- Guardar metricas y matriz de confusion.

4. Registro:
- Registrar modelos y metricas en MLflow.
- Promover RandomForest a stage de produccion.

5. Inferencia:
- API consume modelo registrado y responde predicciones.

6. Persistencia:
- Guardar solicitud/respuesta y metadatos en BD.

7. Visualizacion:
- Frontend muestra prediccion, confianza (si aplica), metricas del modelo y estado del sistema.

## 7) Endpoints minimos de API (MVP)

1. `GET /health`
- Estado de servicio.

2. `GET /model/info`
- Modelo activo, version, fecha, metricas clave.

3. `POST /predict`
- Recibe payload de features y retorna clase predicha.

4. `GET /predictions`
- Historial de predicciones (persistidas).

5. `POST /train` (opcional para demo)
- Dispara pipeline de entrenamiento.

## 8) Frontend minimo para cumplir nota

Pantallas minimas:
1. Dashboard:
- Estado de servicios, modelo activo y metricas base.

2. Prediccion:
- Formulario de entrada + respuesta de API.

3. Historial:
- Tabla de predicciones persistidas.

4. Pipeline/Entrenamiento:
- Boton para ejecutar (si habilitan endpoint) y ver ultimo resultado.

## 9) Roadmap de implementacion por fases

### Fase 0 - Congelamiento de base (hoy)
1. Confirmar informe y notebooks finales proxy-safe.
2. Crear rama de trabajo para entrega final.

### Fase 1 - Ordenamiento del repo
1. Crear estructura `apps/`, `services/`, `notebooks/`, `mlops/`, `docs/`.
2. Migrar notebooks en modo seguro (copiar, validar, mover).

### Fase 2 - Backend/API
1. Crear servicio API (FastAPI recomendado).
2. Implementar `health`, `model/info`, `predict`.
3. Persistir requests/predicciones en PostgreSQL.

### Fase 3 - Entrenamiento + MLflow
1. Crear servicio trainer.
2. Registrar runs, metricas, artefactos y modelos en MLflow.
3. Definir modelo activo por stage/version.

### Fase 4 - Frontend
1. Conectar a API para prediccion y visualizacion.
2. Mostrar metricas y estado de modelo.

### Fase 5 - Compose + demo
1. Integrar todo con `docker-compose`.
2. Probar flujo end-to-end.
3. Preparar demo de 15 minutos + backup de 5 minutos de preguntas.

## 10) Riesgos y mitigaciones

1. Riesgo: romper rutas al mover notebooks.
- Mitigacion: migracion en dos fases con copia + pruebas antes de borrar.

2. Riesgo: sobrecarga por tiempo corto.
- Mitigacion: priorizar MVP funcional completo antes de extras visuales.

3. Riesgo: inconsistencias entre metricas en distintos artefactos.
- Mitigacion: definir una sola fuente de verdad (CSV exportados + MLflow).

4. Riesgo: errores en demo por infraestructura.
- Mitigacion: script de arranque unico, healthchecks y dataset de prueba corto.

## 11) Entregables concretos a construir

1. `docker-compose.yml` funcional con todos los servicios.
2. `Dockerfile` por servicio (`api`, `trainer`, `frontend`).
3. API REST con endpoint de inferencia operativo.
4. Frontend conectado a API.
5. Persistencia de datasets/modelos/metricas/predicciones.
6. Documento tecnico corto de arquitectura y flujo.

## 12) Decision previa a ejecutar cambios

Antes de mover archivos, decidir una de estas dos estrategias:
1. Estrategia conservadora (recomendada): copiar notebooks a `notebooks/`, validar, luego mover definitivo.
2. Estrategia directa: mover con `git mv` y corregir rutas inmediatamente.

Recomendacion final: usar estrategia conservadora para proteger enlaces y reducir riesgo de romper la entrega.
