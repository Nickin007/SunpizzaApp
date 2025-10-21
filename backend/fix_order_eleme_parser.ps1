# Quick Fix: Update Order Eleme Parser to include Store Name
$ErrorActionPreference = "Stop"

Write-Host "Quick Fix: Update Order Eleme Parser" -ForegroundColor Cyan
Write-Host ""

$SERVER_USER = "ubuntu"
$SERVER_IP = "118.89.73.199"
$SERVER_PATH = "/home/ubuntu/SunpizzaApp"
$LOCAL_BACKEND = "C:\Users\YQH20\Desktop\SunpizzaApp\backend"

# Upload parser file
Write-Host "Uploading excel_parser.py..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no "$LOCAL_BACKEND\app\services\excel_parser.py" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/app/services/"
Write-Host "  Parser uploaded!" -ForegroundColor Green
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
Write-Host "Now you can:" -ForegroundColor Yellow
Write-Host "1. Delete old order_eleme data in Data Upload" -ForegroundColor White
Write-Host "2. Re-upload Excel with 4 columns:" -ForegroundColor White
Write-Host "   - Date (日期)" -ForegroundColor Cyan
Write-Host "   - Store Name (门店名称)" -ForegroundColor Cyan
Write-Host "   - Order ID (订单单号)" -ForegroundColor Cyan
Write-Host "   - Product Info (商品信息)" -ForegroundColor Cyan
Write-Host ""

