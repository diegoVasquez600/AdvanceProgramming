param(
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ApiPrefix = "/api/v1"

$ErrorActionPreference = "Stop"

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Get-StatusCodeFromException {
    param([System.Exception]$Exception)

    if ($Exception.Response -and $Exception.Response.StatusCode) {
        return [int]$Exception.Response.StatusCode
    }

    return -1
}

Write-Host "Smoke test against $BaseUrl"

$health = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/health"
Assert-True ($health.StatusCode -eq 200) "GET /api/v1/health failed"
$healthJson = $health.Content | ConvertFrom-Json
Assert-True ($healthJson.status -eq "ok") "GET /health returned unexpected payload"

$models = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/models"
Assert-True ($models.StatusCode -eq 200) "GET /api/v1/models failed"
$modelsJson = $models.Content | ConvertFrom-Json
Assert-True ($modelsJson.available_models -contains "random_forest") "random_forest is missing"
Assert-True ($modelsJson.available_models -contains "logistic_regression") "logistic_regression is missing"

$info = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/model/info"
Assert-True ($info.StatusCode -eq 200) "GET /api/v1/model/info failed"
$infoJson = $info.Content | ConvertFrom-Json
Assert-True ($infoJson.default_model -ne $null) "default_model is missing"

$schema = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/schema/input"
Assert-True ($schema.StatusCode -eq 200) "GET /api/v1/schema/input failed"

$pipelineStatus = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/pipeline/status"
Assert-True ($pipelineStatus.StatusCode -eq 200) "GET /api/v1/pipeline/status failed"

$pipelineReload = Invoke-WebRequest -UseBasicParsing -Method Post "$BaseUrl$ApiPrefix/pipeline/reload-artifacts"
Assert-True ($pipelineReload.StatusCode -eq 200) "POST /api/v1/pipeline/reload-artifacts failed"

$docs = Invoke-WebRequest -UseBasicParsing "$BaseUrl/docs"
Assert-True ($docs.StatusCode -eq 200) "GET /docs failed"

$redoc = Invoke-WebRequest -UseBasicParsing "$BaseUrl/redoc"
Assert-True ($redoc.StatusCode -eq 200) "GET /redoc failed"

$predictRfBody = @{ model_name = "random_forest"; features = @{} } | ConvertTo-Json -Depth 6
$predictRf = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictRfBody "$BaseUrl$ApiPrefix/predict"
Assert-True ($predictRf.StatusCode -eq 200) "POST /api/v1/predict random_forest failed"
$predictRfJson = $predictRf.Content | ConvertFrom-Json
Assert-True ($predictRfJson.prediction_id -ne $null) "predict response missing prediction_id"

$predictLogRegBody = @{ model_name = "logistic_regression"; features = @{} } | ConvertTo-Json -Depth 6
$predictLogReg = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictLogRegBody "$BaseUrl$ApiPrefix/predict"
Assert-True ($predictLogReg.StatusCode -eq 200) "POST /api/v1/predict logistic_regression failed"

$registry = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/models/registry"
Assert-True ($registry.StatusCode -eq 200) "GET /api/v1/models/registry failed"

$registryPaged = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/models/registry?limit=5&offset=0"
Assert-True ($registryPaged.StatusCode -eq 200) "GET /api/v1/models/registry paged failed"

$feedbackBody = @{ true_label = "demo_label"; source = "smoke"; notes = "automated check" } | ConvertTo-Json -Depth 6
$feedback = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $feedbackBody "$BaseUrl$ApiPrefix/predictions/$($predictRfJson.prediction_id)/feedback"
Assert-True ($feedback.StatusCode -eq 200) "POST /api/v1/predictions/{id}/feedback failed"

$feedbackList = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/predictions/feedback"
Assert-True ($feedbackList.StatusCode -eq 200) "GET /api/v1/predictions/feedback failed"

$feedbackListPaged = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/predictions/feedback?limit=5&offset=0"
Assert-True ($feedbackListPaged.StatusCode -eq 200) "GET /api/v1/predictions/feedback paged failed"

$feedbackMetrics = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/predictions/feedback/metrics"
Assert-True ($feedbackMetrics.StatusCode -eq 200) "GET /api/v1/predictions/feedback/metrics failed"

$feedbackCsv = Invoke-WebRequest -UseBasicParsing "$BaseUrl$ApiPrefix/predictions/feedback/export.csv"
Assert-True ($feedbackCsv.StatusCode -eq 200) "GET /api/v1/predictions/feedback/export.csv failed"
Assert-True ($feedbackCsv.Content -match "prediction_id,model_name,model_version") "CSV export header missing"

$feedbackMissingStatus = -1
try {
    $feedbackMissing = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $feedbackBody "$BaseUrl$ApiPrefix/predictions/99999999/feedback"
    $feedbackMissingStatus = [int]$feedbackMissing.StatusCode
} catch {
    $feedbackMissingStatus = Get-StatusCodeFromException -Exception $_.Exception
}
Assert-True ($feedbackMissingStatus -eq 404) "Feedback for unknown prediction_id did not return 404"

$proxyRejectBody = @{ model_name = "random_forest"; features = @{ cultivo = "Cafe" } } | ConvertTo-Json -Depth 6
$proxyStatus = -1
try {
    $proxyReject = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $proxyRejectBody "$BaseUrl$ApiPrefix/predict"
    $proxyStatus = [int]$proxyReject.StatusCode
} catch {
    $proxyStatus = Get-StatusCodeFromException -Exception $_.Exception
}
Assert-True ($proxyStatus -eq 400) "Proxy-column rejection did not return 400"

$unknownRejectBody = @{ model_name = "random_forest"; features = @{ foo_bar = 123 } } | ConvertTo-Json -Depth 6
$unknownStatus = -1
try {
    $unknownReject = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $unknownRejectBody "$BaseUrl$ApiPrefix/predict"
    $unknownStatus = [int]$unknownReject.StatusCode
} catch {
    $unknownStatus = Get-StatusCodeFromException -Exception $_.Exception
}
Assert-True ($unknownStatus -eq 400) "Unknown-feature rejection did not return 400"

Write-Host "Smoke test OK"
