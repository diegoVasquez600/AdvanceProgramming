from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApiBaseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class MetricScores(ApiBaseModel):
    accuracy: float = Field(description="Exactitud global del modelo.", examples=[0.83])
    precision_macro: float = Field(
        description="Precision macro-promedio entre clases.", examples=[0.81]
    )
    recall_macro: float = Field(
        description="Recall macro-promedio entre clases.", examples=[0.79]
    )
    f1_macro: float = Field(
        description="F1 macro-promedio entre clases.", examples=[0.8]
    )


class ModelsResponse(ApiBaseModel):
    default_model: str = Field(
        description="Nombre del modelo por defecto para inferencia.",
        examples=["random_forest"],
    )
    available_models: list[str] = Field(
        description="Modelos cargados en memoria y listos para predecir."
    )
    metrics: Dict[str, MetricScores] = Field(
        description="Metricas por modelo para comparacion rapida."
    )


class FeatureField(ApiBaseModel):
    name: str = Field(description="Nombre tecnico de la feature.")
    type: str = Field(description="Tipo esperado: string o number.")
    nullable: bool = Field(default=True, description="Indica si acepta valor nulo.")
    description: Optional[str] = Field(
        default=None, description="Descripcion funcional de la feature."
    )
    example: Optional[Any] = Field(default=None, description="Ejemplo de valor valido.")


class InputSchemaResponse(ApiBaseModel):
    target_column: str = Field(description="Variable objetivo del problema.")
    blocked_proxy_columns: list[str] = Field(
        description="Columnas prohibidas por riesgo de leakage/proxy bias."
    )
    required_features: list[str] = Field(
        description="Features aceptadas por el pipeline de inferencia."
    )
    features: list[FeatureField] = Field(
        description="Catalogo detallado de features para el frontend dinamico."
    )


class ModelArtifactInfo(ApiBaseModel):
    model_name: str = Field(description="Nombre del modelo entrenado.")
    version: str = Field(description="Version del artefacto/modelo.")
    trained_at: str = Field(description="Fecha de entrenamiento en formato ISO-8601.")
    artifact_path: str = Field(description="Nombre del archivo del artefacto.")
    metrics: MetricScores = Field(description="Metricas validadas para el modelo.")


class ModelMetadataResponse(ApiBaseModel):
    api_version: str = Field(description="Version publica de la API.", examples=["v1"])
    default_model: str = Field(description="Modelo por defecto configurado.")
    experiment_name: Optional[str] = None
    training_timestamp: Optional[str] = None
    models: list[ModelArtifactInfo] = Field(
        description="Lista de artefactos con metadata operativa."
    )


class PredictRequest(ApiBaseModel):
    model_name: Optional[str] = Field(
        default=None,
        description="Modelo a usar. Si se omite, aplica el default_model.",
        examples=["random_forest"],
    )
    features: Dict[str, Any] = Field(
        description="Diccionario de features con los nombres definidos en /schema/input."
    )

    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "examples": [
                {
                    "model_name": "random_forest",
                    "features": {
                        "c_d_dep": 5,
                        "departamento": "Antioquia",
                        "c_d_mun": 1,
                        "municipio": "Medellin",
                        "grupo_de_cultivo": "Cereales",
                        "a_o": 2023,
                        "periodo": "A",
                        "rea_sembrada_ha": 10.5,
                        "rea_cosechada_ha": 10.1,
                        "producci_n_t": 43.0,
                        "rendimiento_t_ha": 4.2,
                    },
                }
            ]
        },
    )


class PredictResponse(ApiBaseModel):
    prediction_id: int = Field(description="ID de auditoria en base de datos.")
    timestamp: str = Field(description="Timestamp de persistencia en ISO-8601.")
    model_name: str = Field(description="Modelo usado para inferencia.")
    model_version: str = Field(description="Version resolvida del modelo.")
    api_version: str = Field(description="Version de API que proceso la solicitud.")
    prediction: str = Field(description="Clase o etiqueta predicha por el modelo.")
    blocked_proxy_columns: list[str] = Field(
        description="Columnas bloqueadas por politica proxy-safe."
    )


class PredictionItem(ApiBaseModel):
    id: int = Field(description="Identificador de la prediccion persistida.")
    timestamp: str = Field(description="Fecha y hora del registro.")
    model_name: str = Field(description="Modelo utilizado en esa inferencia.")
    model_version: str = Field(description="Version de artefacto registrada.")
    api_version: str = Field(description="Version de API al momento de inferencia.")
    prediction: str = Field(description="Resultado predicho.")
    features: Dict[str, Any] = Field(description="Payload de features almacenado.")


class PredictionsResponse(ApiBaseModel):
    count: int = Field(description="Numero total de elementos retornados.")
    items: list[PredictionItem] = Field(description="Historial de predicciones.")


class HealthResponse(ApiBaseModel):
    status: str = Field(description="Estado de salud de la API.", examples=["ok"])


class PipelineStatusResponse(ApiBaseModel):
    api_version: str = Field(description="Version de API expuesta.")
    tracking_uri: str = Field(description="URI de MLflow tracking server.")
    experiment_name: str = Field(description="Nombre de experimento activo en MLflow.")
    models_dir: str = Field(
        description="Directorio local de artefactos para inferencia."
    )
    loaded_models: list[str] = Field(description="Modelos actualmente en memoria.")
    available_artifact_files: list[str] = Field(
        description="Archivos de artefactos detectados en models_dir."
    )
    last_artifacts_reload_at: str = Field(
        description="Timestamp ISO-8601 de la ultima recarga de artefactos."
    )


class PipelineReloadResponse(ApiBaseModel):
    status: str = Field(description="Estado de la operacion.", examples=["ok"])
    message: str = Field(description="Mensaje de resultado para operacion humana.")
    reloaded_models: list[str] = Field(description="Modelos recargados exitosamente.")
    reloaded_at: str = Field(description="Timestamp de recarga de artefactos.")
