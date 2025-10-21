#!/usr/bin/env pwsh
# PowerShell deployment script for active store filtering feature

Write-Host "========================================"
Write-Host "Active Store Filtering - Deployment"
Write-Host "========================================"

$SERVER_IP = "118.89.73.199"
$FRONTEND_SERVER = "118.25.70.79"

Write-Host "`n[Step 1/3] Deploying backend..." -ForegroundColor Green
Write-Host "  - Uploading eleme.py (with active store filtering)..."
scp -o StrictHostKeyChecking=no app/api/eleme.py ubuntu@${SERVER_IP}:/home/ubuntu/SunpizzaApp/backend/app/api/
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Done: eleme.py uploaded" -ForegroundColor Green
} else {
    Write-Host "  Error: Failed to upload backend" -ForegroundColor Red
    exit 1
}

Write-Host "  - Restarting backend service..."
ssh -o StrictHostKeyChecking=no ubuntu@${SERVER_IP} "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 2
Write-Host "  Done: Backend restarted" -ForegroundColor Green

Write-Host "`n[Step 2/3] Building frontend..." -ForegroundColor Green
Push-Location ..\admin-web

Write-Host "  - Running npm run build..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Error: Frontend build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  Done: Frontend build successful" -ForegroundColor Green

Write-Host "`n[Step 3/3] Deploying frontend..." -ForegroundColor Green

Write-Host "  - Compressing frontend files..."
if (Test-Path "dist.zip") {
    Remove-Item "dist.zip" -Force
}
Compress-Archive -Path "dist\*" -DestinationPath "dist.zip" -Force
Write-Host "  Done: Compression complete" -ForegroundColor Green

Write-Host "  - Uploading to frontend server..."
scp -o StrictHostKeyChecking=no dist.zip ubuntu@${FRONTEND_SERVER}:~/
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Done: Upload complete" -ForegroundColor Green
} else {
    Write-Host "  Error: Failed to upload frontend" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "  - Deploying to target directory..."
ssh -o StrictHostKeyChecking=no ubuntu@${FRONTEND_SERVER} @"
cd ~
unzip -o dist.zip -d dist_temp
sudo rm -rf /var/www/html/*
sudo mv dist_temp/* /var/www/html/
rm -rf dist_temp dist.zip
sudo systemctl reload nginx
"@

Pop-Location

Write-Host "`n========================================"
Write-Host "Deployment Completed Successfully!"
Write-Host "========================================"
Write-Host ""
Write-Host "[NEW] Active Store Filtering Feature" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend Changes:" -ForegroundColor Cyan
Write-Host "  * get_anomaly_monitor API: Filter by is_active=True stores" -ForegroundColor White
Write-Host "  * get_anomaly_details API: Filter by is_active=True stores" -ForegroundColor White
Write-Host "  * All 12 anomaly types now auto-filter" -ForegroundColor White
Write-Host "  * Returns filtered_by_active_stores flag" -ForegroundColor White
Write-Host ""
Write-Host "Frontend Changes:" -ForegroundColor Cyan
Write-Host "  * Added blue info alert below upload status" -ForegroundColor White
Write-Host "  * Shows filter notification message" -ForegroundColor White
Write-Host "  * Always visible when data is available" -ForegroundColor White
Write-Host ""
Write-Host "How It Works:" -ForegroundColor Cyan
Write-Host "  1. System queries ElemeActiveStore table" -ForegroundColor Gray
Write-Host "  2. Gets all stores where is_active = True" -ForegroundColor Gray
Write-Host "  3. Filters all anomaly data by these store names" -ForegroundColor Gray
Write-Host "  4. Only shows active stores in all 12 anomaly types" -ForegroundColor Gray
Write-Host ""
Write-Host "12 Filtered Anomaly Types:" -ForegroundColor Cyan
Write-Host "  [1-8]  Store Data" -ForegroundColor White
Write-Host "  [9]    Refund Orders (Order Data)" -ForegroundColor White
Write-Host "  [10]   Bad Reviews (Review Data)" -ForegroundColor White
Write-Host "  [11]   Low Growth Score (Growth Data)" -ForegroundColor White
Write-Host "  [12]   Fans Not Created (Fans Data)" -ForegroundColor White
Write-Host ""
Write-Host "Access URL: http://${FRONTEND_SERVER}:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tips:" -ForegroundColor Gray
Write-Host "  * Update Active Store List to control which stores appear" -ForegroundColor Gray
Write-Host "  * Toggle is_active status to include/exclude stores" -ForegroundColor Gray
Write-Host "  * Filter applies automatically to all anomaly monitoring" -ForegroundColor Gray
Write-Host ""
