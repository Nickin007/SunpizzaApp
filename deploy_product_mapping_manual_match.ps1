# ==========================================
# Product Mapping Manual Match Feature
# ==========================================

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$BACKEND_DIR = "/home/ubuntu/SunpizzaApp/backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Product Mapping Manual Match Deployment" -ForegroundColor Cyan
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

Start-Sleep -Seconds 3

ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl status sunpizza-backend --no-pager | head -15"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "New Feature:" -ForegroundColor Yellow
Write-Host "  Product Mapping - Manual Match for Unmatched Orders" -ForegroundColor Cyan
Write-Host ""
Write-Host "  How it works:" -ForegroundColor White
Write-Host "  1. Go to Product Mapping > Unmatched Orders tab" -ForegroundColor Gray
Write-Host "  2. Click 'Manual Match' button on any unmatched order" -ForegroundColor Gray
Write-Host "  3. Input parsed products (e.g., Pizza*2, Coke*1)" -ForegroundColor Gray
Write-Host "  4. Submit - Order will be moved to Product Mapping Database" -ForegroundColor Gray
Write-Host ""
Write-Host "  Backend API Added:" -ForegroundColor White
Write-Host "  - POST /cost-analysis/manual-match-product-mapping" -ForegroundColor Gray
Write-Host ""
Write-Host "Please refresh browser and test the feature" -ForegroundColor Cyan
Write-Host ""

