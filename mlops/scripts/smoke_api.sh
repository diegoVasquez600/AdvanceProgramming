#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"

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

health="$(request GET /health "" 200)"
assert_contains "${health}" '"status":"ok"' "GET /health should return status ok"

models="$(request GET /models "" 200)"
assert_contains "${models}" '"random_forest"' "GET /models should include random_forest"
assert_contains "${models}" '"svm_rbf"' "GET /models should include svm_rbf"

info="$(request GET /model/info "" 200)"
assert_contains "${info}" '"default_model"' "GET /model/info should include default_model"

predict_rf='{"model_name":"random_forest","features":{}}'
predict_rf_resp="$(request POST /predict "${predict_rf}" 200)"
assert_contains "${predict_rf_resp}" '"model_name":"random_forest"' "POST /predict random_forest should return model_name"

predict_svm='{"model_name":"svm_rbf","features":{}}'
predict_svm_resp="$(request POST /predict "${predict_svm}" 200)"
assert_contains "${predict_svm_resp}" '"model_name":"svm_rbf"' "POST /predict svm_rbf should return model_name"

proxy_reject='{"model_name":"random_forest","features":{"cultivo":"Cafe"}}'
proxy_reject_resp="$(request POST /predict "${proxy_reject}" 400)"
assert_contains "${proxy_reject_resp}" '"Proxy columns are not allowed in payload"' "Proxy column payload should be rejected"

unknown_reject='{"model_name":"random_forest","features":{"foo_bar":123}}'
unknown_reject_resp="$(request POST /predict "${unknown_reject}" 400)"
assert_contains "${unknown_reject_resp}" '"Unknown features in payload"' "Unknown feature payload should be rejected"

echo "Smoke test OK"
