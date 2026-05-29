import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UseFormHandleSubmit,
  UseFormRegister,
  UseFormSetValue,
  useForm,
} from 'react-hook-form';
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

type Preset = {
  key: string;
  title: string;
  description: string;
  values: Record<string, string>;
};

const formSchema = z.object({
  model_name: z.string().min(1, 'Select a model'),
  features: z.record(z.string()),
});

const PERIOD_OPTIONS = ['A', 'B'];
const DEP_OPTIONS = ['Antioquia', 'Boyaca', 'Cundinamarca', 'Meta', 'Nariño', 'Valle del Cauca'];
const MUN_OPTIONS_BY_DEP: Record<string, string[]> = {
  Antioquia: ['Medellin', 'Rionegro', 'Turbo'],
  Boyaca: ['Tunja', 'Duitama', 'Sogamoso'],
  Cundinamarca: ['Bogota', 'Soacha', 'Facatativa'],
  Meta: ['Villavicencio', 'Granada', 'Acacias'],
  'Nariño': ['Pasto', 'Ipiales', 'Tumaco'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Tulua'],
};
const CULTIVO_OPTIONS = ['Cereales', 'Frutales', 'Leguminosas', 'Tuberculos'];

const DEMO_PRESETS: Preset[] = [
  {
    key: 'maiz-andino',
    title: 'Maiz andino',
    description: 'Escenario de rendimiento medio-alto en zona andina.',
    values: {
      c_d_dep: '5',
      departamento: 'Antioquia',
      c_d_mun: '1',
      municipio: 'Medellin',
      grupo_de_cultivo: 'Cereales',
      a_o: '2023',
      periodo: 'A',
      rea_sembrada_ha: '10.5',
      rea_cosechada_ha: '10.1',
      producci_n_t: '43',
      rendimiento_t_ha: '4.2',
    },
  },
  {
    key: 'frutal-valle',
    title: 'Frutal valle',
    description: 'Escenario de area amplia y cosecha estable.',
    values: {
      c_d_dep: '76',
      departamento: 'Valle del Cauca',
      c_d_mun: '1',
      municipio: 'Cali',
      grupo_de_cultivo: 'Frutales',
      a_o: '2024',
      periodo: 'B',
      rea_sembrada_ha: '18',
      rea_cosechada_ha: '17.2',
      producci_n_t: '68',
      rendimiento_t_ha: '3.95',
    },
  },
];

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

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: defaultValues,
  });
  const watchedFeatures = watch('features');

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

  const applyPreset = (presetKey: string) => {
    const preset = DEMO_PRESETS.find((p) => p.key === presetKey);
    if (!preset) {
      return;
    }

    Object.entries(preset.values).forEach(([field, value]) => {
      setValue(`features.${field}`, value, { shouldDirty: true });
    });
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
                setValue={setValue}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                onReset={() => reset(defaultValues)}
                onRefresh={refreshAll}
                onApplyPreset={applyPreset}
                watchedFeatures={watchedFeatures ?? {}}
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
  const bestModel = useMemo(() => {
    if (!props.metricsChartData.length) {
      return null;
    }
    return [...props.metricsChartData].sort((a, b) => b.f1_macro - a.f1_macro)[0];
  }, [props.metricsChartData]);

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

      <article className="card col-4 accent-card">
        <h2>Modelo recomendado</h2>
        <div className="stat">{bestModel?.model ?? 'calculando'}</div>
        <div className="stat-label">
          F1 macro: {bestModel ? bestModel.f1_macro.toFixed(3) : '-'}
        </div>
      </article>

      <article className="card col-8">
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

      <article className="card col-4">
        <h2>Narrativa sugerida (15 min)</h2>
        <ol className="story-list">
          <li>Problema EVA y por que se excluyen columnas proxy.</li>
          <li>Arquitectura desacoplada en Docker Compose.</li>
          <li>Entrenamiento, artefactos y trazabilidad en MLflow.</li>
          <li>Prediccion guiada + feedback de ground truth.</li>
          <li>Cierre con metricas observadas y export CSV.</li>
        </ol>
        <Link className="text-link" to="/prediccion">
          Ir a prediccion en vivo
        </Link>
      </article>

      <article className="card col-12">
        <h2>Arquitectura del sistema (visual)</h2>
        <p className="stat-label">
          Flujo: datos EVA - entrenamiento - modelos - API - frontend - feedback - metricas observadas.
        </p>
        <div className="architecture-flow">
          <div className="flow-node">Dataset EVA</div>
          <div className="flow-arrow">→</div>
          <div className="flow-node">Trainer + MLflow</div>
          <div className="flow-arrow">→</div>
          <div className="flow-node">Artifacts (MinIO/volumen)</div>
          <div className="flow-arrow">→</div>
          <div className="flow-node">API FastAPI</div>
          <div className="flow-arrow">→</div>
          <div className="flow-node">Frontend React</div>
          <div className="flow-arrow">→</div>
          <div className="flow-node">Feedback + Governance</div>
        </div>
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
  setValue: UseFormSetValue<FormValues>;
  handleSubmit: UseFormHandleSubmit<FormValues>;
  onSubmit: (values: FormValues) => void;
  onReset: () => void;
  onRefresh: () => void;
  onApplyPreset: (presetKey: string) => void;
  watchedFeatures: Record<string, string>;
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
  const selectedDep = props.watchedFeatures.departamento || '';
  const municipioOptions = MUN_OPTIONS_BY_DEP[selectedDep] ?? [];

  const coreFields = ['c_d_dep', 'departamento', 'c_d_mun', 'municipio', 'a_o', 'periodo'];
  const productionFields = ['grupo_de_cultivo', 'rea_sembrada_ha', 'rea_cosechada_ha', 'producci_n_t', 'rendimiento_t_ha'];

  const groupedFields = {
    contexto: props.fields.filter((f) => coreFields.includes(f.name)),
    produccion: props.fields.filter((f) => productionFields.includes(f.name)),
    otros: props.fields.filter(
      (f) => !coreFields.includes(f.name) && !productionFields.includes(f.name)
    ),
  };

  const renderFieldInput = (field: FeatureField) => {
    if (field.name === 'departamento') {
      return (
        <select {...props.register(`features.${field.name}`)}>
          <option value="">Selecciona departamento</option>
          {DEP_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.name === 'municipio') {
      return (
        <select {...props.register(`features.${field.name}`)}>
          <option value="">Selecciona municipio</option>
          {municipioOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.name === 'periodo') {
      return (
        <select {...props.register(`features.${field.name}`)}>
          <option value="">Selecciona periodo</option>
          {PERIOD_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.name === 'grupo_de_cultivo') {
      return (
        <select {...props.register(`features.${field.name}`)}>
          <option value="">Selecciona grupo de cultivo</option>
          {CULTIVO_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? '0.01' : undefined}
        placeholder={String(field.example ?? '')}
        {...props.register(`features.${field.name}`)}
      />
    );
  };

  const renderField = (field: FeatureField) => {
    const dictionary = byField.get(field.name);
    return (
      <label key={field.name}>
        {dictionary?.displayName ?? field.name}
        <small className="label-help">
          {dictionary?.description ?? `Campo API: ${field.name}`}
        </small>
        {renderFieldInput(field)}
      </label>
    );
  };

  return (
    <section className="grid fade-in">
      <article className="card col-7">
        <h2>Prediccion guiada para demostracion</h2>
        <p className="stat-label">
          Usa presets para clase o completa manualmente los campos.
        </p>
        <div className="preset-row">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="preset-btn"
              onClick={() => props.onApplyPreset(preset.key)}
              title={preset.description}
            >
              {preset.title}
            </button>
          ))}
        </div>
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
          </div>

          <h3 className="section-title">Contexto geografico y temporal</h3>
          <div className="form-grid">{groupedFields.contexto.map(renderField)}</div>

          <h3 className="section-title">Produccion y rendimiento</h3>
          <div className="form-grid">{groupedFields.produccion.map(renderField)}</div>

          {groupedFields.otros.length > 0 && (
            <>
              <h3 className="section-title">Otros campos disponibles</h3>
              <div className="form-grid">{groupedFields.otros.map(renderField)}</div>
            </>
          )}

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
          <div className="result-banner success">
            <strong>Prediccion lista:</strong> {props.predictResult.prediction}
            <span>
              Modelo: {props.predictResult.model_name} | Version: {props.predictResult.model_version}
            </span>
          </div>
        )}
        {props.predictError && (
          <div className="result-banner error">{String(props.predictError)}</div>
        )}
      </article>

      <article className="card col-5">
        <h2>Metadata de modelos</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Version</th>
                <th>Accuracy</th>
                <th>F1</th>
              </tr>
            </thead>
            <tbody>
              {(props.metadata?.models ?? []).map((m) => (
                <tr key={`${m.model_name}-${m.version}`}>
                  <td>{m.model_name}</td>
                  <td>{m.version}</td>
                  <td>{m.metrics.accuracy.toFixed(3)}</td>
                  <td>{m.metrics.f1_macro.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const metricChartData = (props.feedbackMetrics?.items ?? []).map((item) => ({
    model: item.model_name,
    accuracy: item.observed_accuracy,
    labeled: item.labeled_count,
  }));

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
          <a className="btn-link" href="http://localhost:8000/api/v1/predictions/feedback/export.csv" target="_blank" rel="noreferrer">
            Descargar feedback CSV
          </a>
        </div>
        <div className="kpi-row">
          <div className="kpi-tile">
            <span>Modelos cargados</span>
            <strong>{props.pipelineStatus?.loaded_models.length ?? 0}</strong>
          </div>
          <div className="kpi-tile">
            <span>Artefactos detectados</span>
            <strong>{props.pipelineStatus?.available_artifact_files.length ?? 0}</strong>
          </div>
          <div className="kpi-tile">
            <span>Ultima recarga</span>
            <strong>{props.pipelineStatus?.last_artifacts_reload_at ?? '-'}</strong>
          </div>
        </div>
        {props.pipelineError && <div className="response-box error">{props.pipelineError}</div>}
        {props.reloadResult && <div className="result-banner success">{props.reloadResult.message}</div>}
        {props.reloadError && <div className="response-box error">{props.reloadError}</div>}
      </article>

      <article className="card col-6">
        <h2>Governance: model registry</h2>
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Version</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {(props.modelRegistry?.items ?? []).slice(0, 8).map((item) => (
                <tr key={item.id}>
                  <td>{item.model_name}</td>
                  <td>{item.model_version}</td>
                  <td>{item.is_active ? 'Si' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {props.modelRegistryError && <div className="response-box error">{props.modelRegistryError}</div>}
      </article>

      <article className="card col-6">
        <h2>Governance: feedback y metricas observadas</h2>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={metricChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#2ea47f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Prediccion ID</th>
                <th>Etiqueta real</th>
                <th>Fuente</th>
              </tr>
            </thead>
            <tbody>
              {(props.feedbackList?.items ?? []).slice(0, 8).map((item) => (
                <tr key={item.id}>
                  <td>{item.prediction_id}</td>
                  <td>{item.true_label}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {props.feedbackListError && <div className="response-box error">{props.feedbackListError}</div>}
        {props.feedbackMetricsError && <div className="response-box error">{props.feedbackMetricsError}</div>}
      </article>
    </section>
  );
}
