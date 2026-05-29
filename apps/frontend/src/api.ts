import type {
  HealthResponse,
  InputSchemaResponse,
  ModelMetadataResponse,
  ModelsResponse,
  PipelineReloadResponse,
  PipelineStatusResponse,
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
  predictions: () => http<PredictionsResponse>('/predictions'),
  predict: (payload: PredictRequest) =>
    http<PredictResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
