# ==========================================
# Auto Cascade Feature Backend Deployment
# ==========================================

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$BACKEND_DIR = "/home/ubuntu/SunpizzaApp/backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Upload backend files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
scp backend/app/api/cost_analysis.py ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/app/api/

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Backend file uploaded" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to upload backend file" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Restart backend service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Backend service restarted" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to restart backend service" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "New features:" -ForegroundColor Yellow
Write-Host "- Auto cascade processing API endpoint" -ForegroundColor White
Write-Host "- Manual match for order integration" -ForegroundColor White
Write-Host "- Manual match for cost mapping" -ForegroundColor White
Write-Host "- Cascade updates across all modules" -ForegroundColor White
