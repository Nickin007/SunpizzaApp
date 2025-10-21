# Quick Fix: Filter Deleted Import Logs
$ErrorActionPreference = "Stop"

Write-Host "Quick Fix: Filter Deleted Import Logs" -ForegroundColor Cyan
Write-Host ""

$SERVER_USER = "ubuntu"
$SERVER_IP = "118.89.73.199"
$SERVER_PATH = "/home/ubuntu/SunpizzaApp"
$LOCAL_BACKEND = "C:\Users\YQH20\Desktop\SunpizzaApp\backend"

# Upload API file
Write-Host "Uploading eleme.py..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no "$LOCAL_BACKEND\app\api\eleme.py" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/app/api/"
Write-Host "  API uploaded!" -ForegroundColor Green
Write-Host ""

# Restart backend
Write-Host "Restarting backend service..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 3
Write-Host "  Backend restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Changes:" -ForegroundColor Yellow
Write-Host "- Import logs API now filters out deleted records" -ForegroundColor White
Write-Host "- Upload calendar will no longer show deleted uploads" -ForegroundColor White
Write-Host "- Data upload status check excludes deleted records" -ForegroundColor White
Write-Host ""
Write-Host "Please refresh your browser to see the changes!" -ForegroundColor Cyan
Write-Host ""

