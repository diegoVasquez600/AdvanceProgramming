import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import type { FeatureField, PredictRequest } from './types';

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
    queryFn: api.predictions,
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

  return (
    <div className="page">
      <header className="hero">
        <div>
          <h1 className="title">EVA Proxy-Safe ML Platform</h1>
          <p className="subtitle">
            Dashboard React + Vite + TypeScript con API versionada y trazabilidad.
          </p>
        </div>
        <div className="api-chip">{`API /api/v1 - ${healthQuery.data?.status ?? 'loading'}`}</div>
      </header>

      <section className="grid">
        <article className="card col-4">
          <h2>Modelo por defecto</h2>
          <div className="stat">{modelsQuery.data?.default_model ?? '-'}</div>
          <div className="stat-label">Modelo activo para inferencia</div>
        </article>

        <article className="card col-4">
          <h2>Experimento MLflow</h2>
          <div className="stat">{metadataQuery.data?.experiment_name ?? '-'}</div>
          <div className="stat-label">Tracking de entrenamiento</div>
        </article>

        <article className="card col-4">
          <h2>Predicciones guardadas</h2>
          <div className="stat">{historyQuery.data?.count ?? 0}</div>
          <div className="stat-label">Registros trazables en PostgreSQL</div>
        </article>

        <article className="card col-8">
          <h2>Comparativa de modelos</h2>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={metricsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="accuracy" fill="#0d8a5f" />
                <Bar dataKey="precision_macro" fill="#f2a41b" />
                <Bar dataKey="recall_macro" fill="#2c6ee8" />
                <Bar dataKey="f1_macro" fill="#1c5142" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card col-4">
          <h2>Proxy columns bloqueadas</h2>
          <ul className="code-list">
            {(inputSchemaQuery.data?.blocked_proxy_columns ?? []).map((column) => (
              <li key={column}>{column}</li>
            ))}
          </ul>
        </article>

        <article className="card col-6">
          <h2>Prediccion dinamica</h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <label>
                Modelo
                <select {...register('model_name')}>
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>

              {(inputSchemaQuery.data?.features ?? []).map((field) => (
                <label key={field.name}>
                  {field.name}
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    step={field.type === 'number' ? '0.01' : undefined}
                    placeholder={String(field.example ?? '')}
                    {...register(`features.${field.name}`)}
                  />
                </label>
              ))}
            </div>

            <div className="actions">
              <button className="btn-primary" type="submit" disabled={predictMutation.isPending}>
                {predictMutation.isPending ? 'Prediciendo...' : 'Predecir'}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => reset(defaultValues)}
              >
                Limpiar
              </button>
              <button className="btn-secondary" type="button" onClick={refreshAll}>
                Refrescar
              </button>
            </div>
          </form>

          {predictMutation.data && (
            <div className="response-box">
              {JSON.stringify(predictMutation.data, null, 2)}
            </div>
          )}

          {predictMutation.error && (
            <div className="response-box error">{String(predictMutation.error)}</div>
          )}
        </article>

        <article className="card col-6">
          <h2>Metadata de modelos</h2>
          <div className="response-box">
            {JSON.stringify(metadataQuery.data ?? {}, null, 2)}
          </div>
        </article>

        <article className="card col-12">
          <h2>Historial de predicciones</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Modelo</th>
                  <th>Version</th>
                  <th>Prediccion</th>
                </tr>
              </thead>
              <tbody>
                {(historyQuery.data?.items ?? []).map((item) => (
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
    </div>
  );
}
