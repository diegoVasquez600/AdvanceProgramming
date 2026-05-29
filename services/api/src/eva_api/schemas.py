from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    model_name: Optional[str] = Field(
        default=None, description="random_forest or svm_rbf"
    )
    features: Dict[str, Any]


class PredictResponse(BaseModel):
    model_name: str
    prediction: str
    blocked_proxy_columns: list[str]
