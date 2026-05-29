from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class MetricScores(BaseModel):
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float


class ModelsResponse(BaseModel):
    default_model: str
    available_models: list[str]
    metrics: Dict[str, MetricScores]


class FeatureField(BaseModel):
    name: str
    type: str
    nullable: bool = True
    description: Optional[str] = None
    example: Optional[Any] = None


class InputSchemaResponse(BaseModel):
    target_column: str
    blocked_proxy_columns: list[str]
    required_features: list[str]
    features: list[FeatureField]


class ModelArtifactInfo(BaseModel):
    model_name: str
    version: str
    trained_at: str
    artifact_path: str
    metrics: MetricScores


class ModelMetadataResponse(BaseModel):
    api_version: str
    default_model: str
    experiment_name: Optional[str] = None
    training_timestamp: Optional[str] = None
    models: list[ModelArtifactInfo]


class PredictRequest(BaseModel):
    model_name: Optional[str] = Field(
        default=None, description="random_forest or logistic_regression"
    )
    features: Dict[str, Any]

    model_config = ConfigDict(
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
        }
    )


class PredictResponse(BaseModel):
    prediction_id: int
    timestamp: str
    model_name: str
    model_version: str
    api_version: str
    prediction: str
    blocked_proxy_columns: list[str]


class PredictionItem(BaseModel):
    id: int
    timestamp: str
    model_name: str
    model_version: str
    api_version: str
    prediction: str
    features: Dict[str, Any]


class PredictionsResponse(BaseModel):
    count: int
    items: list[PredictionItem]


class HealthResponse(BaseModel):
    status: str
