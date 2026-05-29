#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3000}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-240}"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "ERROR: required command '${cmd}' is not installed or not in PATH."
    exit 1
  fi
}

request_expect_status() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local expected_status="$4"

  local tmp_file
  tmp_file="$(mktemp)"

  local status
  if [[ -n "${body}" ]]; then
    status="$(curl -sS -o "${tmp_file}" -w "%{http_code}" -X "${method}" -H "Content-Type: application/json" --data "${body}" "${url}")"
  else
    status="$(curl -sS -o "${tmp_file}" -w "%{http_code}" -X "${method}" "${url}")"
  fi

  local response
  response="$(cat "${tmp_file}")"
  rm -f "${tmp_file}"

  if [[ "${status}" != "${expected_status}" ]]; then
    echo "ERROR: ${method} ${url} expected ${expected_status}, got ${status}"
    echo "Response: ${response}"
    exit 1
  fi

  printf "%s" "${response}"
}

wait_http_ok() {
  local name="$1"
  local url="$2"
  local start
  start="$(date +%s)"

  while true; do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      echo "OK: ${name} is reachable at ${url}"
      return 0
    fi

    local now elapsed
    now="$(date +%s)"
    elapsed="$((now - start))"
    if (( elapsed >= MAX_WAIT_SECONDS )); then
      echo "ERROR: timeout waiting for ${name} at ${url}"
      exit 1
    fi

    sleep 2
  done
}

require_cmd docker
require_cmd curl
require_cmd bash

cd "${ROOT_DIR}"

if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  echo "No .env found. Creating it from .env.example"
  cp .env.example .env
fi

echo "==> Building and starting containers"
docker compose up -d --build

echo "==> Current compose status"
docker compose ps

echo "==> Waiting for core endpoints"
wait_http_ok "API health" "${BASE_URL}/api/v1/health"
wait_http_ok "Frontend" "${FRONTEND_URL}"
wait_http_ok "Swagger" "${BASE_URL}/docs"
wait_http_ok "ReDoc" "${BASE_URL}/redoc"
wait_http_ok "MLflow" "http://127.0.0.1:5000"

echo "==> Running automated smoke tests"
bash "${ROOT_DIR}/mlops/scripts/smoke_api.sh" "${BASE_URL}"

echo "==> Running governance rehearsal checks"
pipeline_json="$(request_expect_status GET "${BASE_URL}/api/v1/pipeline/status" "" 200)"
if [[ "${pipeline_json}" != *"loaded_models"* ]]; then
  echo "ERROR: pipeline/status response does not contain loaded_models"
  exit 1
fi

pred_json="$(request_expect_status POST "${BASE_URL}/api/v1/predict" '{"model_name":"random_forest","features":{}}' 200)"
prediction_id="$(printf '%s' "${pred_json}" | sed -n 's/.*"prediction_id":\([0-9][0-9]*\).*/\1/p')"
predicted_label="$(printf '%s' "${pred_json}" | sed -n 's/.*"prediction":"\([^"]*\)".*/\1/p')"
if [[ -z "${prediction_id}" ]]; then
  echo "ERROR: could not parse prediction_id from /predict response"
  echo "Response: ${pred_json}"
  exit 1
fi
if [[ -z "${predicted_label}" ]]; then
  echo "ERROR: could not parse prediction label from /predict response"
  echo "Response: ${pred_json}"
  exit 1
fi

echo "Created prediction_id=${prediction_id}"
feedback_body="{\"true_label\":\"${predicted_label}\",\"source\":\"deploy-script\",\"notes\":\"auto validation\"}"
request_expect_status POST "${BASE_URL}/api/v1/predictions/${prediction_id}/feedback" "${feedback_body}" 200 >/dev/null

metrics_json="$(request_expect_status GET "${BASE_URL}/api/v1/predictions/feedback/metrics" "" 200)"
if [[ "${metrics_json}" != *"items"* ]]; then
  echo "ERROR: feedback/metrics response does not contain items"
  exit 1
fi

csv_content="$(request_expect_status GET "${BASE_URL}/api/v1/predictions/feedback/export.csv" "" 200)"
csv_header="$(printf '%s\n' "${csv_content}" | head -n 1 | tr -d '\r')"
if [[ "${csv_header}" != "prediction_id,model_name,model_version,prediction,true_label,source,notes,labeled_at" ]]; then
  echo "ERROR: unexpected CSV header: ${csv_header}"
  exit 1
fi

echo "==> All checks passed"
echo "Frontend: ${FRONTEND_URL}"
echo "Swagger:  ${BASE_URL}/docs"
echo "ReDoc:    ${BASE_URL}/redoc"
echo "Pipeline + governance flow validated successfully."
