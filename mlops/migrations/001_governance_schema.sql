-- Governance schema migration for EVA Agro Analytics API
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS model_registry (
    id BIGSERIAL PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    artifact_path TEXT NOT NULL,
    experiment_name TEXT,
    training_timestamp TEXT,
    metrics_json JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (model_name, model_version)
);

CREATE TABLE IF NOT EXISTS prediction_requests (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT UNIQUE NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    request_id TEXT UNIQUE NOT NULL,
    model_registry_id BIGINT NOT NULL REFERENCES model_registry(id),
    api_version TEXT NOT NULL DEFAULT 'v1',
    status_code INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_feedback (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT UNIQUE NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    true_label TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    labeled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_requests_created_at
    ON prediction_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_feedback_labeled_at
    ON prediction_feedback(labeled_at DESC);
