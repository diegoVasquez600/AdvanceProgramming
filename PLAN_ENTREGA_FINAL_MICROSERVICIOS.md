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
2. Modelo secundario recomendado: LogisticRegression como comparador simple, rapido y tambien proxy-safe.
3. No usar modelos cuya aparente mejora dependa de variables proxy.
4. No usar KNN como modelo principal para despliegue productivo.

Estrategia recomendada:
1. Publicar RandomForest como modelo activo.
2. Mantener LogisticRegression en MLflow como modelo de comparacion y trazabilidad.
3. Registrar ambos modelos y sus metricas, pero decidir el ganador por desempeno real en datos proxy-safe.

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
- Guardar metricas, matriz de confusion y evidencia de que ambos modelos usan el mismo conjunto proxy-safe.

4. Registro:
- Registrar modelos y metricas en MLflow.
- Promover RandomForest a stage de produccion.

5. Inferencia:
- API consume modelo registrado y responde predicciones.
- La inferencia debe permitir seleccionar explicitamente entre `RandomForest` y `LogisticRegression`.
- Ambos modelos deben ser versiones proxy-safe (entrenados sin variables proxy).
- La seleccion de modelo debe responder a comparacion de generalizacion, no a capacidad de replicar respuestas de proxies.
- La API debe rechazar payloads que incluyan columnas proxy.

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
- Debe aceptar `model_name` (`random_forest` o `logistic_regression`) para escoger modelo.
- Si `model_name` no llega, usar modelo por defecto configurado.
- Debe validar esquema proxy-safe y responder error 400 si llegan variables prohibidas.

4. `GET /models`
- Lista de modelos disponibles para inferencia (solo proxy-safe), con version y metricas.

5. `GET /predictions`
- Historial de predicciones (persistidas).

6. `POST /train` (opcional para demo)
- Dispara pipeline de entrenamiento.

## 8) Frontend minimo para cumplir nota

Pantallas minimas:
1. Dashboard:
- Estado de servicios, modelo activo y metricas base.

2. Prediccion:
- Formulario de entrada + respuesta de API.
- Selector de modelo (`RandomForest` o `LogisticRegression`) antes de predecir.

3. Historial:
- Tabla de predicciones persistidas.

4. Pipeline/Entrenamiento:
- Boton para ejecutar (si habilitan endpoint) y ver ultimo resultado.

## 9) Requisitos UX adicionales para la presentacion final

### 9.1 Comparativa visual de modelos (obligatorio)

Objetivo: mostrar claramente por que se elige RandomForest sobre LogisticRegression en escenario proxy-safe.

Graficas minimas en frontend:
1. Barras comparativas por modelo: accuracy, precision_macro, recall_macro y f1_macro.
2. Matriz de confusion del modelo activo.
3. Tarjeta de "modelo ganador" con criterio explicito (maximo f1_macro).

Fuente de datos recomendada:
1. `reports/informe_modelado_proxy_safe/final_proxy_safe_model_comparison.csv`.
2. Runs/versiones registradas en MLflow para demo en vivo.

### 9.2 Formulario de ingreso de datos para prediccion (obligatorio)

Objetivo: poder ingresar un caso en clase y obtener prediccion en tiempo real.

Funcionalidad minima:
1. Formulario con features requeridas por el modelo.
2. Validaciones de campos (tipos, faltantes y rangos basicos).
3. Selector obligatorio de modelo para inferencia.
4. Envio a `POST /predict` con `model_name`.
5. Bloqueo de variables proxy en el payload (frontend + backend).
6. Mensaje de error claro si el usuario intenta usar variables prohibidas.
7. Respuesta visible: clase predicha + modelo + version + timestamp.
8. Persistencia en historial de predicciones.

### 9.3 Modo presentacion para clase (obligatorio)

Objetivo: tener una seccion tipo storytelling para explicar el proyecto en 15 minutos.

Secciones recomendadas del modo presentacion:
1. Problema y objetivo del proyecto.
2. Arquitectura del sistema (diagrama de microservicios).
3. Flujo de ML end-to-end (ingesta -> preproceso -> entrenamiento -> registro -> inferencia).
4. Proceso proxy-safe (variables removidas + evidencia).
5. Comparativa final de modelos y seleccion.
6. Demo en vivo de prediccion.

Implementacion sugerida:
1. Ruta dedicada del frontend, por ejemplo `/presentation`.
2. Diagrama de arquitectura en Mermaid o imagen exportada.

## 10) Roadmap de implementacion por fases

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
3. Implementar vista de comparativa RandomForest vs LogisticRegression.
4. Implementar formulario validado para prediccion.
5. Implementar ruta `/presentation` para defensa.

### Fase 5 - Compose + demo
1. Integrar todo con `docker-compose`.
2. Probar flujo end-to-end.
3. Preparar demo de 15 minutos + backup de 5 minutos de preguntas.
4. Ensayar secuencia de presentacion completa.

## 11) Riesgos y mitigaciones

1. Riesgo: romper rutas al mover notebooks.
- Mitigacion: migracion en dos fases con copia + pruebas antes de borrar.

2. Riesgo: sobrecarga por tiempo corto.
- Mitigacion: priorizar MVP funcional completo antes de extras visuales.

3. Riesgo: inconsistencias entre metricas en distintos artefactos.
- Mitigacion: definir una sola fuente de verdad (CSV exportados + MLflow).

4. Riesgo: errores en demo por infraestructura.
- Mitigacion: script de arranque unico, healthchecks y dataset de prueba corto.

5. Riesgo: presentacion confusa por exceso de pantallas.
- Mitigacion: usar modo presentacion guiado con flujo fijo de 6 secciones.

## 12) Entregables concretos a construir

1. `docker-compose.yml` funcional con todos los servicios.
2. `Dockerfile` por servicio (`api`, `trainer`, `frontend`).
3. API REST con endpoint de inferencia operativo.
4. Frontend conectado a API.
5. Persistencia de datasets/modelos/metricas/predicciones.
6. Documento tecnico corto de arquitectura y flujo.
7. Vista comparativa de modelos con graficas claras.
8. Vista de prediccion con ingreso manual de datos.
9. Vista de presentacion para defensa en clase.

## 13) Decision previa a ejecutar cambios

Antes de mover archivos, decidir una de estas dos estrategias:
1. Estrategia conservadora (recomendada): copiar notebooks a `notebooks/`, validar, luego mover definitivo.
2. Estrategia directa: mover con `git mv` y corregir rutas inmediatamente.

Recomendacion final: usar estrategia conservadora para proteger enlaces y reducir riesgo de romper la entrega.

## 14) Guion sugerido de presentacion (15 minutos)

1. Min 0-2: problema, dataset EVA y objetivo.
2. Min 2-5: arquitectura de microservicios y responsabilidades de cada servicio.
3. Min 5-8: flujo de ML y persistencia de artefactos/metricas.
4. Min 8-11: evidencia proxy-safe y comparativa de modelos.
5. Min 11-14: demo de prediccion desde formulario.
6. Min 14-15: conclusiones y siguientes pasos.
