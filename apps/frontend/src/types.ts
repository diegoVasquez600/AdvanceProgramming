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

export type PipelineStatusResponse = {
  api_version: string;
  tracking_uri: string;
  experiment_name: string;
  models_dir: string;
  loaded_models: string[];
  available_artifact_files: string[];
  last_artifacts_reload_at: string;
};

export type PipelineReloadResponse = {
  status: string;
  message: string;
  reloaded_models: string[];
  reloaded_at: string;
};

export type ModelRegistryItem = {
  id: number;
  model_name: string;
  model_version: string;
  artifact_path: string;
  experiment_name?: string;
  training_timestamp?: string;
  metrics: Record<string, unknown>;
  is_active: boolean;
  deployed_at: string;
};

export type ModelRegistryResponse = {
  count: number;
  items: ModelRegistryItem[];
};

export type PredictionFeedbackRequest = {
  true_label: string;
  source?: string;
  notes?: string;
};

export type PredictionFeedbackItem = {
  id: number;
  prediction_id: number;
  true_label: string;
  source: string;
  notes?: string;
  labeled_at: string;
};

export type PredictionFeedbackResponse = {
  status: string;
  item: PredictionFeedbackItem;
};

export type PredictionFeedbackListResponse = {
  count: number;
  items: PredictionFeedbackItem[];
};

export type FeedbackMetricItem = {
  model_name: string;
  model_version: string;
  labeled_count: number;
  exact_match_count: number;
  observed_accuracy: number;
};

export type FeedbackMetricsResponse = {
  count: number;
  items: FeedbackMetricItem[];
};
