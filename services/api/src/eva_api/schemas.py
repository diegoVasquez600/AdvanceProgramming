from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApiBaseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class MetricScores(ApiBaseModel):
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float


class ModelsResponse(ApiBaseModel):
    default_model: str
    available_models: list[str]
    metrics: Dict[str, MetricScores]


class FeatureField(ApiBaseModel):
    name: str
    type: str
    nullable: bool = True
    description: Optional[str] = None
    example: Optional[Any] = None


class InputSchemaResponse(ApiBaseModel):
    target_column: str
    blocked_proxy_columns: list[str]
    required_features: list[str]
    features: list[FeatureField]


class ModelArtifactInfo(ApiBaseModel):
    model_name: str
    version: str
    trained_at: str
    artifact_path: str
    metrics: MetricScores


class ModelMetadataResponse(ApiBaseModel):
    api_version: str
    default_model: str
    experiment_name: Optional[str] = None
    training_timestamp: Optional[str] = None
    models: list[ModelArtifactInfo]


class PredictRequest(ApiBaseModel):
    model_name: Optional[str] = Field(
        default=None, description="random_forest or logistic_regression"
    )
    features: Dict[str, Any]

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
    prediction_id: int
    timestamp: str
    model_name: str
    model_version: str
    api_version: str
    prediction: str
    blocked_proxy_columns: list[str]


class PredictionItem(ApiBaseModel):
    id: int
    timestamp: str
    model_name: str
    model_version: str
    api_version: str
    prediction: str
    features: Dict[str, Any]


class PredictionsResponse(ApiBaseModel):
    count: int
    items: list[PredictionItem]


class HealthResponse(ApiBaseModel):
    status: str


class PipelineStatusResponse(ApiBaseModel):
    api_version: str
    tracking_uri: str
    experiment_name: str
    models_dir: str
    loaded_models: list[str]
    available_artifact_files: list[str]
    last_artifacts_reload_at: str


class PipelineReloadResponse(ApiBaseModel):
    status: str
    message: str
    reloaded_models: list[str]
    reloaded_at: str
