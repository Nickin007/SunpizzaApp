#!/usr/bin/env pwsh
# PowerShell deployment script for DataBoard tabs feature
# UTF-8 encoding, Windows line endings

Write-Host "========================================"
Write-Host "DataBoard Tabs Feature - Deployment"
Write-Host "========================================"

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$SERVER_PASS = "YYyy1q2w3e"
$BACKEND_PATH = "/home/ubuntu/SunpizzaApp/backend"
$FRONTEND_SERVER = "118.25.70.79"

# Helper function for SSH commands with password
function Invoke-SSHCommand {
    param([string]$Command)
    Write-Host "  Executing: $Command"
    echo $SERVER_PASS | ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP $Command 2>&1
}

# Step 1: Upload backend API changes
Write-Host "`n[Step 1/3] Uploading backend API changes..." -ForegroundColor Green
Write-Host "  - Uploading eleme.py (date parameter support)..."
scp -o StrictHostKeyChecking=no app/api/eleme.py ${SERVER_USER}@${SERVER_IP}:${BACKEND_PATH}/app/api/
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Done: eleme.py uploaded" -ForegroundColor Green
} else {
    Write-Host "  Error: Failed to upload eleme.py" -ForegroundColor Red
    exit 1
}

# Step 2: Restart backend service
Write-Host "`n[Step 2/3] Restarting backend service..." -ForegroundColor Green
Invoke-SSHCommand "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 2
Invoke-SSHCommand "sudo systemctl status sunpizza-backend --no-pager | head -10"
Write-Host "  Done: Backend restarted" -ForegroundColor Green

# Step 3: Build and deploy frontend
Write-Host "`n[Step 3/3] Building and deploying frontend..." -ForegroundColor Green

# Navigate to admin-web
Push-Location ..\admin-web

Write-Host "  - Running npm run build..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Error: Frontend build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "  Done: Frontend build successful" -ForegroundColor Green

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
Write-Host "Changes:" -ForegroundColor Cyan
Write-Host "  * DataBoard: Added tab structure (Basic + Advanced monitoring)"
Write-Host "  * Basic monitoring: Added date selector for historical data"
Write-Host "  * Backend APIs: Support date parameter (default: yesterday)"
Write-Host "  * Advanced monitoring: Placeholder for future features"
Write-Host "  * Anomaly details: Click cards to view detailed store list (8 anomaly types)"
Write-Host "  * Anomaly details API: /eleme/anomaly-details with anomaly_type and date params"
Write-Host ""
Write-Host "Access URL: http://${FRONTEND_SERVER}:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tips:" -ForegroundColor Gray
Write-Host "  * Hard refresh browser if no updates: Ctrl+Shift+R"
Write-Host "  * Backend logs: ssh ubuntu@${SERVER_IP} 'sudo journalctl -u sunpizza-backend -f'"
Write-Host ""

