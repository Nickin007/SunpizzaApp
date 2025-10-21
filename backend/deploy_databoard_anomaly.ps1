# =========================================
#   Deploy DataBoard Anomaly Monitor
# =========================================

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy DataBoard Anomaly Monitor" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  [+] Data upload status check" -ForegroundColor Green
Write-Host "  [+] 8 anomaly types monitoring" -ForegroundColor Green
Write-Host "  [+] Real-time anomaly dashboard" -ForegroundColor Green
Write-Host ""

# Step 1: Upload backend API
Write-Host "[1/4] Uploading backend API..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/backend/app/api/
Write-Host "  Backend API uploaded!" -ForegroundColor Green

# Step 2: Restart backend service
Write-Host ""
Write-Host "[2/4] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 3
Write-Host "  Backend service restarted!" -ForegroundColor Green

# Step 3: Check backend status
Write-Host ""
Write-Host "[3/4] Checking backend status..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager | head -10"

# Step 4: Build and deploy frontend
Write-Host ""
Write-Host "[4/4] Building and deploying frontend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\..\admin-web"

Write-Host "  Building frontend..." -ForegroundColor Cyan
npm run build

Write-Host "  Compressing dist..." -ForegroundColor Cyan
Compress-Archive -Path "dist\*" -DestinationPath "dist.zip" -Force

Write-Host "  Uploading to server..." -ForegroundColor Cyan
scp dist.zip ubuntu@118.25.70.79:/home/ubuntu/

Write-Host "  Deploying on server..." -ForegroundColor Cyan
ssh ubuntu@118.25.70.79 "cd /home/ubuntu/SunpizzaApp/admin-web && rm -rf dist && unzip -q /home/ubuntu/dist.zip -d dist && rm /home/ubuntu/dist.zip"

Write-Host "  Cleaning up..." -ForegroundColor Cyan
Remove-Item "dist.zip" -Force

Write-Host "  Frontend deployed!" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Visit: http://118.25.70.79" -ForegroundColor White
Write-Host "  2. Navigate to: 饿了么 -> 数据看板" -ForegroundColor White
Write-Host "  3. Check:" -ForegroundColor White
Write-Host "     - Data upload status alert (green/yellow)" -ForegroundColor White
Write-Host "     - Total anomaly count in the circle" -ForegroundColor White
Write-Host "     - 8 anomaly cards with real data" -ForegroundColor White
Write-Host ""

