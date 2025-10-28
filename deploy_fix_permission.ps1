# ==========================================
# Cost Analysis Fix - Quick Deploy
# ==========================================

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$BACKEND_DIR = "/home/ubuntu/SunpizzaApp/backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cost Analysis Fix Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 1: Upload Backend Files" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Uploading cost_analysis.py..." -ForegroundColor Gray

scp backend/app/api/cost_analysis.py ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/app/api/

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Backend file uploaded" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to upload backend file" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 2: Restart Backend Service" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Backend service restarted" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to restart backend service" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 3: Check Service Status" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

Start-Sleep -Seconds 2

ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl status sunpizza-backend --no-pager | head -15"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Changes:" -ForegroundColor Yellow
Write-Host "  1. Fixed product mapping permission issue" -ForegroundColor Cyan
Write-Host "     - Changed /map-products from @admin_required to @token_required" -ForegroundColor White
Write-Host "     - Now only login is required to execute product mapping" -ForegroundColor White
Write-Host ""
Write-Host "  2. Removed auto-cascade mapping feature" -ForegroundColor Cyan
Write-Host "     - Removed /auto-cascade-process API endpoint" -ForegroundColor White
Write-Host "     - Removed auto-cascade trigger after order integration" -ForegroundColor White
Write-Host "     - Removed frontend timer task (runs every minute)" -ForegroundColor White
Write-Host "     - Now need to manually execute product and cost mapping" -ForegroundColor White
Write-Host ""
Write-Host "Please refresh browser to test" -ForegroundColor Cyan
Write-Host ""

