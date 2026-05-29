param(
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

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

Write-Host "Smoke test against $BaseUrl"

$health = Invoke-WebRequest -UseBasicParsing "$BaseUrl/health"
Assert-True ($health.StatusCode -eq 200) "GET /health failed"
$healthJson = $health.Content | ConvertFrom-Json
Assert-True ($healthJson.status -eq "ok") "GET /health returned unexpected payload"

$models = Invoke-WebRequest -UseBasicParsing "$BaseUrl/models"
Assert-True ($models.StatusCode -eq 200) "GET /models failed"
$modelsJson = $models.Content | ConvertFrom-Json
Assert-True ($modelsJson.available_models -contains "random_forest") "random_forest is missing"
Assert-True ($modelsJson.available_models -contains "svm_rbf") "svm_rbf is missing"

$info = Invoke-WebRequest -UseBasicParsing "$BaseUrl/model/info"
Assert-True ($info.StatusCode -eq 200) "GET /model/info failed"
$infoJson = $info.Content | ConvertFrom-Json
Assert-True ($infoJson.default_model -ne $null) "default_model is missing"

$predictRfBody = @{ model_name = "random_forest"; features = @{} } | ConvertTo-Json -Depth 6
$predictRf = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictRfBody "$BaseUrl/predict"
Assert-True ($predictRf.StatusCode -eq 200) "POST /predict random_forest failed"

$predictSvmBody = @{ model_name = "svm_rbf"; features = @{} } | ConvertTo-Json -Depth 6
$predictSvm = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictSvmBody "$BaseUrl/predict"
Assert-True ($predictSvm.StatusCode -eq 200) "POST /predict svm_rbf failed"

$proxyRejectBody = @{ model_name = "random_forest"; features = @{ cultivo = "Cafe" } } | ConvertTo-Json -Depth 6
$proxyReject = Invoke-WebRequest -UseBasicParsing -SkipHttpErrorCheck -Method Post -ContentType "application/json" -Body $proxyRejectBody "$BaseUrl/predict"
Assert-True ($proxyReject.StatusCode -eq 400) "Proxy-column rejection did not return 400"

$unknownRejectBody = @{ model_name = "random_forest"; features = @{ foo_bar = 123 } } | ConvertTo-Json -Depth 6
$unknownReject = Invoke-WebRequest -UseBasicParsing -SkipHttpErrorCheck -Method Post -ContentType "application/json" -Body $unknownRejectBody "$BaseUrl/predict"
Assert-True ($unknownReject.StatusCode -eq 400) "Unknown-feature rejection did not return 400"

Write-Host "Smoke test OK"
