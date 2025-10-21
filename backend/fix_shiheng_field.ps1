# Quick fix for store_name_shiheng field handling
$ErrorActionPreference = "Stop"

Write-Host "Quick Fix: Update Backend API for store_name_shiheng" -ForegroundColor Cyan
Write-Host ""

$SERVER_USER = "ubuntu"
$SERVER_IP = "118.89.73.199"
$SERVER_PATH = "/home/ubuntu/SunpizzaApp"
$LOCAL_BACKEND = "C:\Users\YQH20\Desktop\SunpizzaApp\backend"

# Upload backend API file
Write-Host "Uploading backend API..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no "$LOCAL_BACKEND\app\api\eleme.py" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/app/api/"
Write-Host "  Backend API uploaded!" -ForegroundColor Green
Write-Host ""

# Restart backend
Write-Host "Restarting backend service..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 3
Write-Host "  Backend restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "Fix completed! Please test again." -ForegroundColor Green

