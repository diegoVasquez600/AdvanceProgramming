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

function Get-StatusCodeFromException {
    param([System.Exception]$Exception)

    if ($Exception.Response -and $Exception.Response.StatusCode) {
        return [int]$Exception.Response.StatusCode
    }

    return -1
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
Assert-True ($modelsJson.available_models -contains "logistic_regression") "logistic_regression is missing"

$info = Invoke-WebRequest -UseBasicParsing "$BaseUrl/model/info"
Assert-True ($info.StatusCode -eq 200) "GET /model/info failed"
$infoJson = $info.Content | ConvertFrom-Json
Assert-True ($infoJson.default_model -ne $null) "default_model is missing"

$predictRfBody = @{ model_name = "random_forest"; features = @{} } | ConvertTo-Json -Depth 6
$predictRf = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictRfBody "$BaseUrl/predict"
Assert-True ($predictRf.StatusCode -eq 200) "POST /predict random_forest failed"

$predictLogRegBody = @{ model_name = "logistic_regression"; features = @{} } | ConvertTo-Json -Depth 6
$predictLogReg = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictLogRegBody "$BaseUrl/predict"
Assert-True ($predictLogReg.StatusCode -eq 200) "POST /predict logistic_regression failed"

$proxyRejectBody = @{ model_name = "random_forest"; features = @{ cultivo = "Cafe" } } | ConvertTo-Json -Depth 6
$proxyStatus = -1
try {
    $proxyReject = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $proxyRejectBody "$BaseUrl/predict"
    $proxyStatus = [int]$proxyReject.StatusCode
} catch {
    $proxyStatus = Get-StatusCodeFromException -Exception $_.Exception
}
Assert-True ($proxyStatus -eq 400) "Proxy-column rejection did not return 400"

$unknownRejectBody = @{ model_name = "random_forest"; features = @{ foo_bar = 123 } } | ConvertTo-Json -Depth 6
$unknownStatus = -1
try {
    $unknownReject = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $unknownRejectBody "$BaseUrl/predict"
    $unknownStatus = [int]$unknownReject.StatusCode
} catch {
    $unknownStatus = Get-StatusCodeFromException -Exception $_.Exception
}
Assert-True ($unknownStatus -eq 400) "Unknown-feature rejection did not return 400"

Write-Host "Smoke test OK"
