# ==========================================
# Add Edit Feature - Full Deployment
# ==========================================

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$BACKEND_DIR = "/home/ubuntu/SunpizzaApp/backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Edit Feature Deployment" -ForegroundColor Cyan
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
Write-Host "New Features Added:" -ForegroundColor Yellow
Write-Host "  1. Edit button for all order records" -ForegroundColor Cyan
Write-Host "     - Order Integration Database: Edit all fields" -ForegroundColor White
Write-Host "     - Product Mapping Database: Edit all fields including parsed products" -ForegroundColor White
Write-Host "     - Cost Mapping Database: Edit all fields including order cost" -ForegroundColor White
Write-Host ""
Write-Host "  2. Backend API Endpoints Added" -ForegroundColor Cyan
Write-Host "     - PUT /cost-analysis/integrated-orders/:id" -ForegroundColor White
Write-Host "     - PUT /cost-analysis/product-mappings/:id" -ForegroundColor White
Write-Host "     - PUT /cost-analysis/cost-mappings/:id" -ForegroundColor White
Write-Host ""
Write-Host "Please refresh browser to test the edit feature" -ForegroundColor Cyan
Write-Host ""

