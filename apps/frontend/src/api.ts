import type {
  FeedbackMetricsResponse,
  HealthResponse,
  InputSchemaResponse,
  ModelMetadataResponse,
  ModelRegistryResponse,
  ModelsResponse,
  PipelineReloadResponse,
  PipelineStatusResponse,
  PredictionFeedbackListResponse,
  PredictionFeedbackRequest,
  PredictionFeedbackResponse,
  PredictRequest,
  PredictResponse,
  PredictionsResponse,
} from './types';

const API_BASE = '/api/v1';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const body = await response.json();
      detail = JSON.stringify(body);
    } catch {
      detail = await response.text();
    }
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }

  return response.json() as Promise<T>;
}

async function httpText(path: string, init?: RequestInit): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }

  return response.text();
}

function withPagination(path: string, limit = 100, offset = 0): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return `${path}?${params.toString()}`;
}

export const api = {
  health: () => http<HealthResponse>('/health'),
  models: () => http<ModelsResponse>('/models'),
  metadata: () => http<ModelMetadataResponse>('/model/info'),
  inputSchema: () => http<InputSchemaResponse>('/schema/input'),
  pipelineStatus: () => http<PipelineStatusResponse>('/pipeline/status'),
  reloadArtifacts: () =>
    http<PipelineReloadResponse>('/pipeline/reload-artifacts', {
      method: 'POST',
    }),
  predictions: (limit?: number, offset?: number) =>
    http<PredictionsResponse>(withPagination('/predictions', limit, offset)),
  modelRegistry: (limit?: number, offset?: number) =>
    http<ModelRegistryResponse>(withPagination('/models/registry', limit, offset)),
  addPredictionFeedback: (predictionId: number, payload: PredictionFeedbackRequest) =>
    http<PredictionFeedbackResponse>(`/predictions/${predictionId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  predictionFeedback: (limit?: number, offset?: number) =>
    http<PredictionFeedbackListResponse>(
      withPagination('/predictions/feedback', limit, offset)
    ),
  predictionFeedbackMetrics: () =>
    http<FeedbackMetricsResponse>('/predictions/feedback/metrics'),
  exportPredictionFeedbackCsv: () =>
    httpText('/predictions/feedback/export.csv'),
  predict: (payload: PredictRequest) =>
    http<PredictResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
