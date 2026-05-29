import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UseFormHandleSubmit, UseFormRegister, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { api } from './api';
import { EVA_COLUMNS } from './evaColumns';
import type {
  FeatureField,
  ModelMetadataResponse,
  ModelRegistryResponse,
  FeedbackMetricsResponse,
  PipelineReloadResponse,
  PipelineStatusResponse,
  PredictionFeedbackListResponse,
  PredictRequest,
  PredictResponse,
} from './types';

type FormValues = {
  model_name: string;
  features: Record<string, string>;
};

const formSchema = z.object({
  model_name: z.string().min(1, 'Select a model'),
  features: z.record(z.string()),
});

function castFeatureValue(field: FeatureField, value: string): unknown {
  if (value.trim() === '') {
    return null;
  }
  if (field.type === 'number') {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }
  return value;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const queryClient = useQueryClient();

  const healthQuery = useQuery({ queryKey: ['health'], queryFn: api.health });
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: api.models });
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata });
  const inputSchemaQuery = useQuery({
    queryKey: ['inputSchema'],
    queryFn: api.inputSchema,
  });
  const historyQuery = useQuery({
    queryKey: ['predictions'],
    queryFn: () => api.predictions(100, 0),
  });
  const pipelineStatusQuery = useQuery({
    queryKey: ['pipelineStatus'],
    queryFn: api.pipelineStatus,
  });
  const modelRegistryQuery = useQuery<ModelRegistryResponse>({
    queryKey: ['modelRegistry'],
    queryFn: () => api.modelRegistry(50, 0),
  });
  const feedbackListQuery = useQuery<PredictionFeedbackListResponse>({
    queryKey: ['feedbackList'],
    queryFn: () => api.predictionFeedback(20, 0),
  });
  const feedbackMetricsQuery = useQuery<FeedbackMetricsResponse>({
    queryKey: ['feedbackMetrics'],
    queryFn: api.predictionFeedbackMetrics,
  });

  const modelOptions = modelsQuery.data?.available_models ?? [];
  const metrics = modelsQuery.data?.metrics ?? {};

  const defaultValues = useMemo<FormValues>(() => {
    const fields = inputSchemaQuery.data?.features ?? [];
    const seed: Record<string, string> = {};
    fields.forEach((field) => {
      seed[field.name] = '';
    });

    return {
      model_name: modelsQuery.data?.default_model ?? '',
      features: seed,
    };
  }, [inputSchemaQuery.data?.features, modelsQuery.data?.default_model]);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: defaultValues,
  });

  const predictMutation = useMutation({
    mutationFn: (payload: PredictRequest) => api.predict(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });

  const reloadArtifactsMutation = useMutation({
    mutationFn: api.reloadArtifacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['inputSchema'] });
      queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] });
    },
  });

  const metricsChartData = useMemo(
    () =>
      Object.entries(metrics).map(([model, values]) => ({
        model,
        accuracy: values.accuracy,
        precision_macro: values.precision_macro,
        recall_macro: values.recall_macro,
        f1_macro: values.f1_macro,
      })),
    [metrics]
  );

  const onSubmit = (values: FormValues) => {
    if (!inputSchemaQuery.data) {
      return;
    }

    const castedFeatures: Record<string, unknown> = {};
    inputSchemaQuery.data.features.forEach((field) => {
      castedFeatures[field.name] = castFeatureValue(
        field,
        values.features[field.name] ?? ''
      );
    });

    predictMutation.mutate({
      model_name: values.model_name,
      features: castedFeatures,
    });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries();
  };

  const serviceCards = [
    {
      name: 'API REST',
      endpoint: '/api/v1/health',
      status: healthQuery.data?.status ?? 'cargando',
      external: false,
    },
    {
      name: 'Swagger UI',
      endpoint: 'http://localhost:8000/docs',
      status: 'disponible',
      external: true,
    },
    {
      name: 'ReDoc',
      endpoint: 'http://localhost:8000/redoc',
      status: 'disponible',
      external: true,
    },
    {
      name: 'MLflow',
      endpoint: 'http://localhost:5000',
      status: 'tracking',
      external: true,
    },
    {
      name: 'MinIO Console',
      endpoint: 'http://localhost:9001',
      status: 'object storage',
      external: true,
    },
    {
      name: 'PostgreSQL',
      endpoint: 'localhost:5432',
      status: 'persistencia',
      external: false,
    },
    {
      name: 'Model Registry',
      endpoint: '/api/v1/models/registry',
      status: `${modelRegistryQuery.data?.count ?? 0} registros`,
      external: false,
    },
    {
      name: 'Prediction Feedback',
      endpoint: '/api/v1/predictions/feedback',
      status: `${feedbackListQuery.data?.count ?? 0} etiquetas`,
      external: false,
    },
    {
      name: 'Feedback Metrics',
      endpoint: '/api/v1/predictions/feedback/metrics',
      status: `${feedbackMetricsQuery.data?.count ?? 0} agregados`,
      external: false,
    },
  ];

  return (
    <div className="app-root">
      <div className="texture"></div>
      <div className="page">
        <header className="hero">
          <div>
            <h1 className="title">Plataforma EVA Agro Analytics</h1>
            <p className="subtitle">
              Arquitectura de ingenieria para analitica, inferencia y trazabilidad del dataset EVA.
            </p>
          </div>
          <div className="badge-row">
            <span className="api-chip">{`API /api/v1 - ${healthQuery.data?.status ?? 'loading'}`}</span>
            <span className="api-chip">{`Modelo base: ${modelsQuery.data?.default_model ?? '-'}`}</span>
          </div>
        </header>

        <nav className="main-nav">
          <NavLink to="/" end>
            Presentacion
          </NavLink>
          <NavLink to="/prediccion">Prediccion</NavLink>
          <NavLink to="/servicios">Servicios y API</NavLink>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <PresentationPage
                metricsChartData={metricsChartData}
                experimentName={metadataQuery.data?.experiment_name ?? '-'}
                predictionCount={historyQuery.data?.count ?? 0}
                blockedColumns={inputSchemaQuery.data?.blocked_proxy_columns ?? []}
              />
            }
          />
          <Route
            path="/presentation"
            element={
              <PresentationPage
                metricsChartData={metricsChartData}
                experimentName={metadataQuery.data?.experiment_name ?? '-'}
                predictionCount={historyQuery.data?.count ?? 0}
                blockedColumns={inputSchemaQuery.data?.blocked_proxy_columns ?? []}
              />
            }
          />
          <Route
            path="/prediccion"
            element={
              <PredictionPage
                modelOptions={modelOptions}
                fields={inputSchemaQuery.data?.features ?? []}
                register={register}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                onReset={() => reset(defaultValues)}
                onRefresh={refreshAll}
                predictPending={predictMutation.isPending}
                predictResult={predictMutation.data}
                predictError={predictMutation.error}
                metadata={metadataQuery.data}
                history={historyQuery.data?.items ?? []}
              />
            }
          />
          <Route
            path="/servicios"
            element={
              <ServicesPage
                cards={serviceCards}
                pipelineStatus={pipelineStatusQuery.data}
                pipelineError={pipelineStatusQuery.error ? String(pipelineStatusQuery.error) : null}
                reloadResult={reloadArtifactsMutation.data}
                reloadPending={reloadArtifactsMutation.isPending}
                reloadError={reloadArtifactsMutation.error ? String(reloadArtifactsMutation.error) : null}
                modelRegistry={modelRegistryQuery.data}
                modelRegistryError={modelRegistryQuery.error ? String(modelRegistryQuery.error) : null}
                feedbackList={feedbackListQuery.data}
                feedbackListError={feedbackListQuery.error ? String(feedbackListQuery.error) : null}
                feedbackMetrics={feedbackMetricsQuery.data}
                feedbackMetricsError={feedbackMetricsQuery.error ? String(feedbackMetricsQuery.error) : null}
                onReloadArtifacts={() => reloadArtifactsMutation.mutate()}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

type PresentationPageProps = {
  metricsChartData: Array<{
    model: string;
    accuracy: number;
    precision_macro: number;
    recall_macro: number;
    f1_macro: number;
  }>;
  experimentName: string;
  predictionCount: number;
  blockedColumns: string[];
};

function PresentationPage(props: PresentationPageProps) {
  return (
    <section className="grid fade-in">
      <article className="card col-4">
        <h2>Experimento MLflow</h2>
        <div className="stat">{props.experimentName}</div>
        <div className="stat-label">Seguimiento de entrenamiento y metricas</div>
      </article>

      <article className="card col-4">
        <h2>Predicciones registradas</h2>
        <div className="stat">{props.predictionCount}</div>
        <div className="stat-label">Historial con trazabilidad en PostgreSQL</div>
      </article>

      <article className="card col-4">
        <h2>Variables no permitidas</h2>
        <ul className="code-list">
          {props.blockedColumns.map((column) => (
            <li key={column}>{column}</li>
          ))}
        </ul>
      </article>

      <article className="card col-7">
        <h2>Comparativa de modelos</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={props.metricsChartData}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="model" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="accuracy" fill="#1f7a62" />
              <Bar dataKey="precision_macro" fill="#f2a93b" />
              <Bar dataKey="recall_macro" fill="#2a66d9" />
              <Bar dataKey="f1_macro" fill="#133f35" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="card col-5">
        <h2>Narrativa de presentacion</h2>
        <ol className="story-list">
          <li>Contexto del problema EVA y cobertura nacional.</li>
          <li>Arquitectura de servicios: API, entrenamiento, tracking y storage.</li>
          <li>Comparativa de modelos y criterios de seleccion.</li>
          <li>Demo en vivo de prediccion y consulta de historial.</li>
          <li>Trazabilidad en MLflow y documentacion API con Swagger/ReDoc.</li>
        </ol>
        <Link className="text-link" to="/prediccion">
          Ir a prediccion en vivo
        </Link>
      </article>

      <article className="card col-12">
        <h2>Diccionario de columnas EVA (17)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Columna</th>
                <th>Campo API</th>
                <th>Tipo</th>
                <th>Descripcion</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {EVA_COLUMNS.map((col) => (
                <tr key={col.apiField}>
                  <td>{col.displayName}</td>
                  <td>{col.apiField}</td>
                  <td>{col.dataType}</td>
                  <td>{col.description}</td>
                  <td>
                    <span className={`pill pill-${col.role}`}>
                      {col.role === 'entrada_modelo'
                        ? 'Entrada modelo'
                        : col.role === 'proxy_bloqueada'
                          ? 'Restringida'
                          : 'Objetivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

type PredictionPageProps = {
  modelOptions: string[];
  fields: FeatureField[];
  register: UseFormRegister<FormValues>;
  handleSubmit: UseFormHandleSubmit<FormValues>;
  onSubmit: (values: FormValues) => void;
  onReset: () => void;
  onRefresh: () => void;
  predictPending: boolean;
  predictResult: PredictResponse | undefined;
  predictError: Error | null;
  metadata: ModelMetadataResponse | undefined;
  history: Array<{
    id: number;
    timestamp: string;
    model_name: string;
    model_version: string;
    prediction: string;
  }>;
};

function PredictionPage(props: PredictionPageProps) {
  const byField = useMemo(
    () => new Map(EVA_COLUMNS.map((col) => [col.apiField, col])),
    []
  );

  return (
    <section className="grid fade-in">
      <article className="card col-7">
        <h2>Prediccion con formulario dinamico</h2>
        <form onSubmit={props.handleSubmit(props.onSubmit)}>
          <div className="form-grid">
            <label>
              Modelo
              <select {...props.register('model_name')}>
                {props.modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            {props.fields.map((field) => {
              const dictionary = byField.get(field.name);
              return (
                <label key={field.name}>
                  {dictionary?.displayName ?? field.name}
                  <small className="label-help">
                    {dictionary?.description ?? `Campo API: ${field.name}`}
                  </small>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    step={field.type === 'number' ? '0.01' : undefined}
                    placeholder={String(field.example ?? '')}
                    {...props.register(`features.${field.name}`)}
                  />
                </label>
              );
            })}
          </div>

          <div className="actions">
            <button className="btn-primary" type="submit" disabled={props.predictPending}>
              {props.predictPending ? 'Prediciendo...' : 'Ejecutar prediccion'}
            </button>
            <button className="btn-secondary" type="button" onClick={props.onReset}>
              Limpiar
            </button>
            <button className="btn-secondary" type="button" onClick={props.onRefresh}>
              Refrescar datos
            </button>
          </div>
        </form>

        {props.predictResult && (
          <div className="response-box">{JSON.stringify(props.predictResult, null, 2)}</div>
        )}
        {props.predictError && (
          <div className="response-box error">{String(props.predictError)}</div>
        )}
      </article>

      <article className="card col-5">
        <h2>Metadata de modelos</h2>
        <div className="response-box">{JSON.stringify(props.metadata ?? {}, null, 2)}</div>
      </article>

      <article className="card col-12">
        <h2>Historial de predicciones</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Modelo</th>
                <th>Version</th>
                <th>Prediccion</th>
              </tr>
            </thead>
            <tbody>
              {props.history.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.timestamp}</td>
                  <td>{item.model_name}</td>
                  <td>{item.model_version}</td>
                  <td>{item.prediction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

type ServicesPageProps = {
  cards: Array<{
    name: string;
    endpoint: string;
    status: string;
    external: boolean;
  }>;
  pipelineStatus: PipelineStatusResponse | undefined;
  pipelineError: string | null;
  reloadResult: PipelineReloadResponse | undefined;
  reloadPending: boolean;
  reloadError: string | null;
  modelRegistry: ModelRegistryResponse | undefined;
  modelRegistryError: string | null;
  feedbackList: PredictionFeedbackListResponse | undefined;
  feedbackListError: string | null;
  feedbackMetrics: FeedbackMetricsResponse | undefined;
  feedbackMetricsError: string | null;
  onReloadArtifacts: () => void;
};

function ServicesPage(props: ServicesPageProps) {
  return (
    <section className="grid fade-in">
      <article className="card col-12">
        <h2>Servicios de la plataforma</h2>
        <div className="services-grid">
          {props.cards.map((card) => (
            <div className="service-card" key={card.name}>
              <strong>{card.name}</strong>
              <span>{card.status}</span>
              {card.external ? (
                <a href={card.endpoint} target="_blank" rel="noreferrer">
                  Abrir {card.endpoint}
                </a>
              ) : (
                <code>{card.endpoint}</code>
              )}
            </div>
          ))}
        </div>
      </article>

      <article className="card col-7">
        <h2>Endpoints API v1 recomendados para demo</h2>
        <ul className="service-list">
          <li>GET /api/v1/health</li>
          <li>GET /api/v1/models</li>
          <li>GET /api/v1/model/info</li>
          <li>GET /api/v1/schema/input</li>
          <li>GET /api/v1/pipeline/status</li>
          <li>POST /api/v1/pipeline/reload-artifacts</li>
          <li>POST /api/v1/predict</li>
          <li>GET /api/v1/predictions?limit=20&offset=0</li>
          <li>GET /api/v1/models/registry?limit=20&offset=0</li>
          <li>POST /api/v1/predictions/{'{id}'}/feedback</li>
          <li>GET /api/v1/predictions/feedback?limit=20&offset=0</li>
          <li>GET /api/v1/predictions/feedback/metrics</li>
          <li>GET /api/v1/predictions/feedback/export.csv</li>
        </ul>
      </article>

      <article className="card col-5">
        <h2>Documentacion</h2>
        <p className="stat-label">
          Este modulo centraliza accesos para demostrar estandares de API en clase.
        </p>
        <div className="actions">
          <a className="btn-link" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            Swagger UI
          </a>
          <a className="btn-link" href="http://localhost:8000/redoc" target="_blank" rel="noreferrer">
            ReDoc
          </a>
        </div>
      </article>

      <article className="card col-12">
        <h2>Interaccion con pipeline</h2>
        <p className="stat-label">
          Flujo recomendado: ejecutar <strong>docker compose run --rm trainer</strong> y luego recargar artefactos desde este panel.
        </p>
        <div className="actions">
          <button className="btn-primary" type="button" onClick={props.onReloadArtifacts} disabled={props.reloadPending}>
            {props.reloadPending ? 'Recargando...' : 'Recargar artefactos de modelo'}
          </button>
        </div>
        <div className="response-box">
          {JSON.stringify(props.pipelineStatus ?? {}, null, 2)}
        </div>
        {props.pipelineError && <div className="response-box error">{props.pipelineError}</div>}
        {props.reloadResult && <div className="response-box">{JSON.stringify(props.reloadResult, null, 2)}</div>}
        {props.reloadError && <div className="response-box error">{props.reloadError}</div>}
      </article>

      <article className="card col-6">
        <h2>Governance: model registry</h2>
        <div className="response-box">{JSON.stringify(props.modelRegistry ?? {}, null, 2)}</div>
        {props.modelRegistryError && <div className="response-box error">{props.modelRegistryError}</div>}
      </article>

      <article className="card col-6">
        <h2>Governance: feedback y metricas observadas</h2>
        <div className="response-box">{JSON.stringify(props.feedbackList ?? {}, null, 2)}</div>
        <div className="response-box">{JSON.stringify(props.feedbackMetrics ?? {}, null, 2)}</div>
        {props.feedbackListError && <div className="response-box error">{props.feedbackListError}</div>}
        {props.feedbackMetricsError && <div className="response-box error">{props.feedbackMetricsError}</div>}
      </article>
    </section>
  );
}
