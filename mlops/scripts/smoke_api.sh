#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"
API_PREFIX="/api/v1"

echo "Smoke test against ${BASE_URL}"

assert_contains() {
  local text="$1"
  local expected="$2"
  local message="$3"

  if [[ "${text}" != *"${expected}"* ]]; then
    echo "Assertion failed: ${message}"
    echo "Expected to find: ${expected}"
    echo "Actual: ${text}"
    exit 1
  fi
}

request() {
  local method="$1"
  local endpoint="$2"
  local body="$3"
  local expected_status="$4"

  local response_file
  response_file="$(mktemp)"

  local status
  if [[ -n "${body}" ]]; then
    status="$(curl -sS -o "${response_file}" -w "%{http_code}" -X "${method}" -H "Content-Type: application/json" --data "${body}" "${BASE_URL}${endpoint}")"
  else
    status="$(curl -sS -o "${response_file}" -w "%{http_code}" -X "${method}" "${BASE_URL}${endpoint}")"
  fi

  local response
  response="$(cat "${response_file}")"
  rm -f "${response_file}"

  if [[ "${status}" != "${expected_status}" ]]; then
    echo "Request failed: ${method} ${endpoint}"
    echo "Expected status: ${expected_status}, got: ${status}"
    echo "Response: ${response}"
    exit 1
  fi

  printf "%s" "${response}"
}

health="$(request GET "${API_PREFIX}/health" "" 200)"
assert_contains "${health}" '"status":"ok"' "GET /api/v1/health should return status ok"

models="$(request GET "${API_PREFIX}/models" "" 200)"
assert_contains "${models}" '"random_forest"' "GET /api/v1/models should include random_forest"
assert_contains "${models}" '"logistic_regression"' "GET /api/v1/models should include logistic_regression"

info="$(request GET "${API_PREFIX}/model/info" "" 200)"
assert_contains "${info}" '"default_model"' "GET /api/v1/model/info should include default_model"

schema="$(request GET "${API_PREFIX}/schema/input" "" 200)"
assert_contains "${schema}" '"required_features"' "GET /api/v1/schema/input should include required_features"

docs="$(request GET /docs "" 200)"
assert_contains "${docs}" 'Swagger UI' "GET /docs should load swagger"

redoc="$(request GET /redoc "" 200)"
assert_contains "${redoc}" 'ReDoc' "GET /redoc should load redoc"

predict_rf='{"model_name":"random_forest","features":{}}'
predict_rf_resp="$(request POST "${API_PREFIX}/predict" "${predict_rf}" 200)"
assert_contains "${predict_rf_resp}" '"model_name":"random_forest"' "POST /predict random_forest should return model_name"

predict_logreg='{"model_name":"logistic_regression","features":{}}'
predict_logreg_resp="$(request POST "${API_PREFIX}/predict" "${predict_logreg}" 200)"
assert_contains "${predict_logreg_resp}" '"model_name":"logistic_regression"' "POST /predict logistic_regression should return model_name"

proxy_reject='{"model_name":"random_forest","features":{"cultivo":"Cafe"}}'
proxy_reject_resp="$(request POST "${API_PREFIX}/predict" "${proxy_reject}" 400)"
assert_contains "${proxy_reject_resp}" '"Proxy columns are not allowed in payload"' "Proxy column payload should be rejected"

unknown_reject='{"model_name":"random_forest","features":{"foo_bar":123}}'
unknown_reject_resp="$(request POST "${API_PREFIX}/predict" "${unknown_reject}" 400)"
assert_contains "${unknown_reject_resp}" '"Unknown features in payload"' "Unknown feature payload should be rejected"

echo "Smoke test OK"
