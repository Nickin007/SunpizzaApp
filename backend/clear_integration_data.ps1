# Clear all order integration data
# This script will delete all records from integrated_orders and unmatched_orders tables

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clear Order Integration Data" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$BACKEND_PATH = "/home/ubuntu/SunpizzaApp/backend"

# Step 1: Upload clear script
Write-Host "[1/2] Uploading clear script..." -ForegroundColor Yellow
scp deploy/clear_integration_data.py ${SERVER_USER}@${SERVER_IP}:${BACKEND_PATH}/deploy/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Upload successful!`n" -ForegroundColor Green

# Step 2: Execute clear script
Write-Host "[2/2] Executing clear script..." -ForegroundColor Yellow
ssh ${SERVER_USER}@${SERVER_IP} "cd ${BACKEND_PATH} && source venv/bin/activate && python deploy/clear_integration_data.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Clear script failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Data cleared successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "What was cleared:" -ForegroundColor Cyan
Write-Host "  - All integrated orders (eleme_integrated_orders table)" -ForegroundColor White
Write-Host "  - All unmatched orders (eleme_unmatched_orders table)`n" -ForegroundColor White

Write-Host "You can now re-integrate orders with the corrected logic!" -ForegroundColor Yellow

