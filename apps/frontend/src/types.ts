export type HealthResponse = {
  status: string;
};

export type MetricScores = {
  accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
};

export type ModelsResponse = {
  default_model: string;
  available_models: string[];
  metrics: Record<string, MetricScores>;
};

export type FeatureField = {
  name: string;
  type: 'number' | 'string' | string;
  nullable: boolean;
  description?: string;
  example?: unknown;
};

export type InputSchemaResponse = {
  target_column: string;
  blocked_proxy_columns: string[];
  required_features: string[];
  features: FeatureField[];
};

export type ModelArtifactInfo = {
  model_name: string;
  version: string;
  trained_at: string;
  artifact_path: string;
  metrics: MetricScores;
};

export type ModelMetadataResponse = {
  api_version: string;
  default_model: string;
  experiment_name?: string;
  training_timestamp?: string;
  models: ModelArtifactInfo[];
};

export type PredictRequest = {
  model_name?: string;
  features: Record<string, unknown>;
};

export type PredictResponse = {
  prediction_id: number;
  timestamp: string;
  model_name: string;
  model_version: string;
  api_version: string;
  prediction: string;
  blocked_proxy_columns: string[];
};

export type PredictionItem = {
  id: number;
  timestamp: string;
  model_name: string;
  model_version: string;
  api_version: string;
  prediction: string;
  features: Record<string, unknown>;
};

export type PredictionsResponse = {
  count: number;
  items: PredictionItem[];
};
