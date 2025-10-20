# ============================================
#  Force Reload All Gunicorn Workers
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Force Reload All Workers" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/7] Checking current file on server..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "grep '%Y%m%d' ~/SunpizzaApp/backend/app/services/excel_parser.py"
Write-Host ""

Write-Host "[2/7] Stopping systemd service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl stop sunpizza-backend"
Write-Host "  Service stopped!" -ForegroundColor Green
Write-Host ""

Write-Host "[3/7] Finding all Python processes..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "ps aux | grep 'gunicorn\|python.*sunpizza' | grep -v grep"
Write-Host ""

Write-Host "[4/7] Killing ALL Python/Gunicorn processes..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo pkill -9 -f gunicorn"
ssh ubuntu@118.89.73.199 "sudo pkill -9 -f 'python.*sunpizza'"
Write-Host "  All processes killed!" -ForegroundColor Green
Write-Host ""

Write-Host "[5/7] Waiting 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

Write-Host "[6/7] Starting service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl start sunpizza-backend"
Write-Host "  Service started!" -ForegroundColor Green
Write-Host ""

Write-Host "[7/7] Waiting 10 seconds for full startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""

Write-Host "Checking service status..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager -l | head -20"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  All Workers Reloaded!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now please test upload again!" -ForegroundColor Yellow
Write-Host ""

