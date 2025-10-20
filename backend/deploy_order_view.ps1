# ============================================
#  Deploy Order Data View Feature
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Order Data View Feature" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Upload backend file
Write-Host "[1/2] Uploading backend file..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Upload complete!" -ForegroundColor Green
Write-Host ""

# Restart backend service
Write-Host "[2/2] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Restart failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Backend service restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Backend Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "New API Endpoint:" -ForegroundColor Yellow
Write-Host "  GET /api/eleme/order-data" -ForegroundColor Cyan
Write-Host ""
Write-Host "Supports Parameters:" -ForegroundColor Yellow
Write-Host "  - page: Page number" -ForegroundColor White
Write-Host "  - per_page: Items per page" -ForegroundColor White
Write-Host "  - start_date: Start date (YYYY-MM-DD)" -ForegroundColor White
Write-Host "  - end_date: End date (YYYY-MM-DD)" -ForegroundColor White
Write-Host "  - store_id: Store ID filter" -ForegroundColor White
Write-Host "  - store_name: Store name search" -ForegroundColor White
Write-Host "  - order_status: Order status filter" -ForegroundColor White
Write-Host "  - order_id: Order ID search" -ForegroundColor White
Write-Host ""
Write-Host "Next: Deploy frontend" -ForegroundColor Yellow
Write-Host "  cd ../admin-web" -ForegroundColor Cyan
Write-Host "  .\deploy_order_view.ps1" -ForegroundColor Cyan
Write-Host ""

