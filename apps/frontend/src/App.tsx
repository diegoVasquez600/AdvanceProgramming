import { useMemo, useState } from 'react';
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

type DaneLocation = {
  departamento: string;
  c_d_dep: string;
  municipio: string;
  c_d_mun: string;
  periodo: string;
  a_o: string;
  grupo_de_cultivo: string;
};

type PresentationTab = 'pitch' | 'arquitectura' | 'repositorio' | 'documentacion';

const formSchema = z.object({
  model_name: z.string().min(1, 'Select a model'),
  features: z.record(z.string()),
});

const DANE_LOCATION_CATALOG: DaneLocation[] = [
  {
    departamento: 'BOYACA',
    c_d_dep: '15',
    municipio: 'BUSBANZA',
    c_d_mun: '15114',
    periodo: '2006B',
    a_o: '2006',
    grupo_de_cultivo: 'HORTALIZAS',
  },
  {
    departamento: 'BOYACA',
    c_d_dep: '15',
    municipio: 'PAIPA',
    c_d_mun: '15516',
    periodo: '2007B',
    a_o: '2007',
    grupo_de_cultivo: 'HORTALIZAS',
  },
  {
    departamento: 'CUNDINAMARCA',
    c_d_dep: '25',
    municipio: 'SOACHA',
    c_d_mun: '25754',
    periodo: '2007A',
    a_o: '2007',
    grupo_de_cultivo: 'HORTALIZAS',
  },
  {
    departamento: 'CUNDINAMARCA',
    c_d_dep: '25',
    municipio: 'COTA',
    c_d_mun: '25214',
    periodo: '2007A',
    a_o: '2007',
    grupo_de_cultivo: 'HORTALIZAS',
  },
  {
    departamento: 'NORTE DE SANTANDER',
    c_d_dep: '54',
    municipio: 'LOS PATIOS',
    c_d_mun: '54405',
    periodo: '2006B',
    a_o: '2006',
    grupo_de_cultivo: 'HORTALIZAS',
  },
  {
    departamento: 'NORTE DE SANTANDER',
    c_d_dep: '54',
    municipio: 'PAMPLONA',
    c_d_mun: '54518',
    periodo: '2007A',
    a_o: '2007',
    grupo_de_cultivo: 'HORTALIZAS',
  },
  {
    departamento: 'SANTANDER',
    c_d_dep: '68',
    municipio: 'LA BELLEZA',
    c_d_mun: '68377',
    periodo: '2007A',
    a_o: '2007',
    grupo_de_cultivo: 'HORTALIZAS',
  },
  {
    departamento: 'CAUCA',
    c_d_dep: '19',
    municipio: 'LA SIERRA',
    c_d_mun: '19392',
    periodo: '2007B',
    a_o: '2007',
    grupo_de_cultivo: 'HORTALIZAS',
  },
];

const DANE_BY_DEPARTMENT = DANE_LOCATION_CATALOG.reduce<Record<string, DaneLocation[]>>(
  (acc, item) => {
    if (!acc[item.departamento]) {
      acc[item.departamento] = [];
    }
    acc[item.departamento].push(item);
    return acc;
  },
  {}
);

const DEP_OPTIONS = Object.keys(DANE_BY_DEPARTMENT).sort();
const PERIOD_OPTIONS = Array.from(new Set(DANE_LOCATION_CATALOG.map((item) => item.periodo))).sort();
const CULTIVO_OPTIONS = [
  'HORTALIZAS',
  'CEREALES',
  'FRUTALES',
  'LEGUMINOSAS',
  'TUBERCULOS',
  'PLATANO',
];

const DEMO_PRESETS: Preset[] = [
  {
    key: 'busbanza-2006b',
    title: 'BUSBANZA 2006B',
    description: 'Ejemplo real EVA (Boyaca, hortalizas).',
    values: {
      c_d_dep: '15',
      departamento: 'BOYACA',
      c_d_mun: '15114',
      municipio: 'BUSBANZA',
      grupo_de_cultivo: 'HORTALIZAS',
      a_o: '2006',
      periodo: '2006B',
      rea_sembrada_ha: '2',
      rea_cosechada_ha: '1',
      producci_n_t: '1',
      rendimiento_t_ha: '1',
    },
  },
  {
    key: 'soacha-2007a',
    title: 'SOACHA 2007A',
    description: 'Ejemplo real EVA (Cundinamarca, alto volumen).',
    values: {
      c_d_dep: '25',
      departamento: 'CUNDINAMARCA',
      c_d_mun: '25754',
      municipio: 'SOACHA',
      grupo_de_cultivo: 'HORTALIZAS',
      a_o: '2007',
      periodo: '2007A',
      rea_sembrada_ha: '72',
      rea_cosechada_ha: '70',
      producci_n_t: '1260',
      rendimiento_t_ha: '18',
    },
  },
  {
    key: 'cota-2007a',
    title: 'COTA 2007A',
    description: 'Ejemplo real EVA (Cundinamarca, hortalizas).',
    values: {
      c_d_dep: '25',
      departamento: 'CUNDINAMARCA',
      c_d_mun: '25214',
      municipio: 'COTA',
      grupo_de_cultivo: 'HORTALIZAS',
      a_o: '2007',
      periodo: '2007A',
      rea_sembrada_ha: '2',
      rea_cosechada_ha: '2',
      producci_n_t: '34',
      rendimiento_t_ha: '17',
    },
  },
  {
    key: 'pamplona-2007a',
    title: 'PAMPLONA 2007A',
    description: 'Ejemplo real EVA (Norte de Santander).',
    values: {
      c_d_dep: '54',
      departamento: 'NORTE DE SANTANDER',
      c_d_mun: '54518',
      municipio: 'PAMPLONA',
      grupo_de_cultivo: 'HORTALIZAS',
      a_o: '2007',
      periodo: '2007A',
      rea_sembrada_ha: '1',
      rea_cosechada_ha: '1',
      producci_n_t: '5',
      rendimiento_t_ha: '10',
    },
  },
  {
    key: 'la-belleza-2007a',
    title: 'LA BELLEZA 2007A',
    description: 'Ejemplo real EVA (Santander).',
    values: {
      c_d_dep: '68',
      departamento: 'SANTANDER',
      c_d_mun: '68377',
      municipio: 'LA BELLEZA',
      grupo_de_cultivo: 'HORTALIZAS',
      a_o: '2007',
      periodo: '2007A',
      rea_sembrada_ha: '1',
      rea_cosechada_ha: '1',
      producci_n_t: '6',
      rendimiento_t_ha: '6',
    },
  },
  {
    key: 'la-sierra-2007b',
    title: 'LA SIERRA 2007B',
    description: 'Ejemplo real EVA (Cauca).',
    values: {
      c_d_dep: '19',
      departamento: 'CAUCA',
      c_d_mun: '19392',
      municipio: 'LA SIERRA',
      grupo_de_cultivo: 'HORTALIZAS',
      a_o: '2007',
      periodo: '2007B',
      rea_sembrada_ha: '2',
      rea_cosechada_ha: '2',
      producci_n_t: '10',
      rendimiento_t_ha: '5',
    },
  },
];

const PRESENTATION_PITCH = [
  {
    minute: '00-02',
    title: 'Contexto y objetivo',
    message: 'Que problema resuelve EVA y por que se modela ciclo de cultivo con variables proxy bloqueadas.',
    evidence: 'Muestra tarjeta de variables restringidas y diccionario EVA.',
  },
  {
    minute: '02-05',
    title: 'Arquitectura y despliegue',
    message: 'Explica microservicios en Docker Compose y trazabilidad end-to-end.',
    evidence: 'Usa diagrama de arquitectura y flujo Dataset -> API -> Feedback.',
  },
  {
    minute: '05-08',
    title: 'Entrenamiento y modelo ganador',
    message: 'Describe comparativa RF vs Logistic Regression y criterio por F1 macro.',
    evidence: 'Grafico de barras + tarjeta de modelo recomendado.',
  },
  {
    minute: '08-12',
    title: 'Demo operativa',
    message: 'Ejecuta prediccion con presets EVA, luego valida historial y feedback.',
    evidence: 'Navega a Prediccion y luego Servicios/API para gobernanza.',
  },
  {
    minute: '12-15',
    title: 'Gobernanza y cierre',
    message: 'Cierra con metricas observadas, export CSV y estado de servicios.',
    evidence: 'Abre endpoints de metrics/export y deja evidencias de reproducibilidad.',
  },
];

const REPO_STRUCTURE_LINES = [
  'AdvanceProgramming/',
  '├─ data/',
  '│  └─ Evaluaciones_Agropecuarias_Municipales_EVA.csv',
  '├─ services/',
  '│  ├─ api/ (FastAPI + ReDoc + governance endpoints)',
  '│  └─ trainer/ (entrenamiento y artefactos)',
  '├─ apps/',
  '│  └─ frontend/ (React dashboard interactivo)',
  '├─ mlops/',
  '│  ├─ migrations/ (esquema SQL governance)',
  '│  └─ scripts/ (deploy_and_validate + smoke_api)',
  '├─ artifacts/models/ (modelos versionados)',
  '└─ docs/ (architecture.md + runbook.md)',
];

const ARCHITECTURE_DIAGRAMS = [
  {
    title: 'Arquitectura de Base de Datos',
    src: 'http://localhost:8000/static/diagrams/db-governance-schema.svg',
    description:
      'Relaciona predicciones, registro de modelos y feedback para trazabilidad y evaluacion observada.',
  },
  {
    title: 'Diagrama de Clases API',
    src: 'http://localhost:8000/static/diagrams/api-class-governance-diagram.svg',
    description:
      'Expone contratos, schemas y endpoints versionados usados por frontend, docs y scripts operativos.',
  },
];

const DOCUMENTATION_LINKS = [
  {
    title: 'Runbook de operacion',
    href: 'http://localhost:8000/redoc',
    description: 'Secuencia de despliegue, endpoints y evidencia tecnica para clase.',
  },
  {
    title: 'Swagger API v1',
    href: 'http://localhost:8000/docs',
    description: 'Contrato ejecutable para demostrar request/response en vivo.',
  },
  {
    title: 'MLflow Tracking',
    href: 'http://localhost:5000',
    description: 'Corridas, metricas y artefactos de entrenamiento con trazabilidad temporal.',
  },
];

function castFeatureValue(field: FeatureField, value: string): unknown {
  if (value.trim() === '') {
    return null;
  }
  if (field.type === 'number') {
    const normalized = value.replace(/,/g, '').trim();
    const num = Number(normalized);
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
  const [activeTab, setActiveTab] = useState<PresentationTab>('pitch');

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

      <article className="card col-12 deck-card">
        <div className="deck-header">
          <h2>Presentacion Ejecutiva Interactiva</h2>
          <span className="deck-chip">Modo clase: 15 minutos</span>
        </div>
        <p className="stat-label">
          Esta seccion funciona como una presentacion tipo PowerPoint, pero conectada al sistema real.
        </p>

        <div className="deck-tabs">
          <button
            type="button"
            className={`deck-tab ${activeTab === 'pitch' ? 'active' : ''}`}
            onClick={() => setActiveTab('pitch')}
          >
            Guion 15 min
          </button>
          <button
            type="button"
            className={`deck-tab ${activeTab === 'arquitectura' ? 'active' : ''}`}
            onClick={() => setActiveTab('arquitectura')}
          >
            Arquitectura
          </button>
          <button
            type="button"
            className={`deck-tab ${activeTab === 'repositorio' ? 'active' : ''}`}
            onClick={() => setActiveTab('repositorio')}
          >
            Estructura repo
          </button>
          <button
            type="button"
            className={`deck-tab ${activeTab === 'documentacion' ? 'active' : ''}`}
            onClick={() => setActiveTab('documentacion')}
          >
            Docs y evidencia
          </button>
        </div>

        {activeTab === 'pitch' && (
          <div className="deck-panel fade-in">
            <div className="timeline-list">
              {PRESENTATION_PITCH.map((step) => (
                <article key={step.minute} className="timeline-item">
                  <div className="timeline-minute">{step.minute}</div>
                  <h3>{step.title}</h3>
                  <p>{step.message}</p>
                  <small>{step.evidence}</small>
                </article>
              ))}
            </div>
            <div className="deck-actions">
              <Link className="btn-link" to="/prediccion">
                Ir a demo de prediccion
              </Link>
              <Link className="btn-link" to="/servicios">
                Ir a servicios y gobernanza
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'arquitectura' && (
          <div className="deck-panel fade-in">
            <p className="stat-label">
              Flujo operacional: dataset EVA → trainer → artefactos → API → frontend → feedback → metricas observadas.
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

            <div className="diagram-grid">
              {ARCHITECTURE_DIAGRAMS.map((diagram) => (
                <figure key={diagram.title} className="diagram-card">
                  <img src={diagram.src} alt={diagram.title} loading="lazy" />
                  <figcaption>
                    <strong>{diagram.title}</strong>
                    <p>{diagram.description}</p>
                    <a className="text-link" href={diagram.src} target="_blank" rel="noreferrer">
                      Abrir diagrama completo
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'repositorio' && (
          <div className="deck-panel fade-in">
            <p className="stat-label">
              Vista de carpetas clave para explicar organizacion de codigo, datos, modelos y operaciones.
            </p>
            <pre className="repo-tree">{REPO_STRUCTURE_LINES.join('\n')}</pre>
          </div>
        )}

        {activeTab === 'documentacion' && (
          <div className="deck-panel fade-in">
            <div className="doc-grid">
              {DOCUMENTATION_LINKS.map((doc) => (
                <article key={doc.title} className="doc-card">
                  <h3>{doc.title}</h3>
                  <p>{doc.description}</p>
                  <a className="btn-link" href={doc.href} target="_blank" rel="noreferrer">
                    Abrir recurso
                  </a>
                </article>
              ))}
            </div>
            <p className="label-help">
              Recomendacion para presentar: abrir ReDoc y explicar primero el contrato; luego mostrar MLflow como evidencia de entrenamiento.
            </p>
          </div>
        )}
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
  const municipalities = DANE_BY_DEPARTMENT[selectedDep] ?? [];
  const municipioOptions = municipalities.map((item) => item.municipio);

  const coreFields = ['c_d_dep', 'departamento', 'c_d_mun', 'municipio', 'a_o', 'periodo'];
  const productionFields = ['grupo_de_cultivo', 'rea_sembrada_ha', 'rea_cosechada_ha', 'producci_n_t', 'rendimiento_t_ha'];

  const groupedFields = {
    contexto: props.fields.filter((f) => coreFields.includes(f.name)),
    produccion: props.fields.filter((f) => productionFields.includes(f.name)),
    otros: props.fields.filter(
      (f) => !coreFields.includes(f.name) && !productionFields.includes(f.name)
    ),
  };

  const handleDepartamentoChange = (departamento: string) => {
    const firstLocation = DANE_BY_DEPARTMENT[departamento]?.[0];
    props.setValue('features.departamento', departamento, { shouldDirty: true });
    props.setValue('features.c_d_dep', firstLocation?.c_d_dep ?? '', { shouldDirty: true });
    props.setValue('features.municipio', '', { shouldDirty: true });
    props.setValue('features.c_d_mun', '', { shouldDirty: true });
  };

  const handleMunicipioChange = (municipio: string) => {
    props.setValue('features.municipio', municipio, { shouldDirty: true });
    const selectedLocation = municipalities.find((item) => item.municipio === municipio);
    if (!selectedLocation) {
      return;
    }

    props.setValue('features.c_d_dep', selectedLocation.c_d_dep, { shouldDirty: true });
    props.setValue('features.c_d_mun', selectedLocation.c_d_mun, { shouldDirty: true });

    if (!(props.watchedFeatures.periodo ?? '').trim()) {
      props.setValue('features.periodo', selectedLocation.periodo, { shouldDirty: true });
    }
    if (!(props.watchedFeatures.a_o ?? '').trim()) {
      props.setValue('features.a_o', selectedLocation.a_o, { shouldDirty: true });
    }
    if (!(props.watchedFeatures.grupo_de_cultivo ?? '').trim()) {
      props.setValue('features.grupo_de_cultivo', selectedLocation.grupo_de_cultivo, {
        shouldDirty: true,
      });
    }
  };

  const renderFieldInput = (field: FeatureField) => {
    if (field.name === 'departamento') {
      return (
        <select
          {...props.register(`features.${field.name}`, {
            onChange: (event) => handleDepartamentoChange(event.target.value),
          })}
        >
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
        <select
          {...props.register(`features.${field.name}`, {
            onChange: (event) => handleMunicipioChange(event.target.value),
          })}
          disabled={!selectedDep}
        >
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
      const currentValue = props.watchedFeatures.periodo ?? '';
      const periodOptions = currentValue && !PERIOD_OPTIONS.includes(currentValue)
        ? [currentValue, ...PERIOD_OPTIONS]
        : PERIOD_OPTIONS;
      return (
        <select {...props.register(`features.${field.name}`)}>
          <option value="">Selecciona periodo</option>
          {periodOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.name === 'grupo_de_cultivo') {
      const currentValue = props.watchedFeatures.grupo_de_cultivo ?? '';
      const cultivoOptions = currentValue && !CULTIVO_OPTIONS.includes(currentValue)
        ? [currentValue, ...CULTIVO_OPTIONS]
        : CULTIVO_OPTIONS;
      return (
        <select {...props.register(`features.${field.name}`)}>
          <option value="">Selecciona grupo de cultivo</option>
          {cultivoOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.name === 'c_d_dep' || field.name === 'c_d_mun') {
      return (
        <input
          type="text"
          readOnly
          className="field-readonly"
          placeholder="Inferido automaticamente por DANE"
          {...props.register(`features.${field.name}`)}
        />
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
          Usa presets del dataset EVA y desprendibles DANE para reducir digitacion manual.
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
        <p className="label-help">
          Al seleccionar departamento y municipio, los codigos DANE se infieren automaticamente.
        </p>
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
