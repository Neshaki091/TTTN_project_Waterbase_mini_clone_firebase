$headers = @{
    "x-app-id" = "iEMcWkXSC1QB"
    "x-api-key" = "test-key"
}

Write-Host "Testing /api/v1/waterdb/stats..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost/api/v1/waterdb/stats" -Headers $headers -Method Get
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
