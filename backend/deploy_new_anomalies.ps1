#!/usr/bin/env pwsh
# PowerShell deployment script for new anomaly types
# UTF-8 encoding, Windows line endings

Write-Host "========================================"
Write-Host "New Anomaly Types - Deployment"
Write-Host "========================================"

$SERVER_IP = "118.89.73.199"
$FRONTEND_SERVER = "118.25.70.79"

Write-Host "`n[Step 1/3] Deploying backend..." -ForegroundColor Green
Write-Host "  - Uploading eleme.py (11 anomaly types)..."
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
Write-Host "New Features:" -ForegroundColor Cyan
Write-Host "  [9] Refund Orders (申请退款) - From Order Data" -ForegroundColor Yellow
Write-Host "      Display: Order ID, Store, Time, Status, Products, Note, Reason, Income"
Write-Host ""
Write-Host "  [10] Bad Reviews (顾客差评) - From Review Data" -ForegroundColor Yellow
Write-Host "       Display: Date, Store, Order ID, Time, Score, Content, Appeal Status"
Write-Host ""
Write-Host "  [11] Low Growth Score (低店铺分) - From Growth Data" -ForegroundColor Yellow
Write-Host "       Display: Date, Store, Score + 13 conditional score fields"
Write-Host ""
Write-Host "Key Improvements:" -ForegroundColor Cyan
Write-Host "  ✓ Added 3 new anomaly monitoring types (total: 11 types)"
Write-Host "  ✓ Different units: 家 (stores) / 单 (orders) / 条 (reviews)"
Write-Host "  ✓ Dynamic table columns based on anomaly type"
Write-Host "  ✓ Conditional field display for growth scores (only show != 100)"
Write-Host "  ✓ Enhanced detail modal with tooltip for long text"
Write-Host "  ✓ New icons: DollarOutlined, FrownOutlined, TrophyOutlined"
Write-Host ""
Write-Host "Access URL: http://${FRONTEND_SERVER}:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tips:" -ForegroundColor Gray
Write-Host "  * Hard refresh browser: Ctrl+Shift+R"
Write-Host "  * Click any anomaly card to view detailed list"
Write-Host "  * Backend logs: ssh ubuntu@${SERVER_IP} 'sudo journalctl -u sunpizza-backend -f'"
Write-Host ""

