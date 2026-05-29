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

$docs = Invoke-WebRequest -UseBasicParsing "$BaseUrl/docs"
Assert-True ($docs.StatusCode -eq 200) "GET /docs failed"

$redoc = Invoke-WebRequest -UseBasicParsing "$BaseUrl/redoc"
Assert-True ($redoc.StatusCode -eq 200) "GET /redoc failed"

$predictRfBody = @{ model_name = "random_forest"; features = @{} } | ConvertTo-Json -Depth 6
$predictRf = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictRfBody "$BaseUrl$ApiPrefix/predict"
Assert-True ($predictRf.StatusCode -eq 200) "POST /api/v1/predict random_forest failed"

$predictLogRegBody = @{ model_name = "logistic_regression"; features = @{} } | ConvertTo-Json -Depth 6
$predictLogReg = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType "application/json" -Body $predictLogRegBody "$BaseUrl$ApiPrefix/predict"
Assert-True ($predictLogReg.StatusCode -eq 200) "POST /api/v1/predict logistic_regression failed"

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
