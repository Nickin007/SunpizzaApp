#!/usr/bin/env pwsh
# PowerShell deployment script for fans anomaly type
# UTF-8 encoding, Windows line endings

Write-Host "========================================"
Write-Host "Fans Anomaly Type - Quick Deployment"
Write-Host "========================================"

$SERVER_IP = "118.89.73.199"
$FRONTEND_SERVER = "118.25.70.79"

Write-Host "`n[Step 1/3] Deploying backend..." -ForegroundColor Green
Write-Host "  - Uploading eleme.py (12 anomaly types)..."
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
Write-Host "[12] Fans Not Created (粉丝群未创建) - NEW!" -ForegroundColor Yellow
Write-Host "     Data Source: Fans Data Table" -ForegroundColor Gray
Write-Host "     Condition: group_type = '未创建'" -ForegroundColor Gray
Write-Host "     Display: Date, Store Name, Reach Threshold, Group Type" -ForegroundColor Gray
Write-Host "     Icon: TeamOutlined (团队图标)" -ForegroundColor Gray
Write-Host ""
Write-Host "Complete Anomaly List (12 types):" -ForegroundColor Cyan
Write-Host "  [1-8]  Store Data: 闭店/库存/超时/拒单/取消/退单/评分/差评" -ForegroundColor White
Write-Host "  [9]    Order Data: 申请退款 (Refund Orders)" -ForegroundColor White
Write-Host "  [10]   Review Data: 顾客差评 (Bad Reviews)" -ForegroundColor White
Write-Host "  [11]   Growth Data: 低店铺分 (Low Growth Score)" -ForegroundColor White
Write-Host "  [12]   Fans Data: 粉丝群未创建 (Fans Not Created) ⭐NEW" -ForegroundColor Green
Write-Host ""
Write-Host "Access URL: http://${FRONTEND_SERVER}:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tips:" -ForegroundColor Gray
Write-Host "  * Hard refresh browser: Ctrl+Shift+R"
Write-Host "  * Click any anomaly card to view detailed list"
Write-Host "  * Total: 12 anomaly monitoring types"
Write-Host ""

