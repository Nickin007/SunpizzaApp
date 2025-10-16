# Deploy Backend Fix - Add admin filter to search user API
# This completes the frontend-backend permission system integration

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Backend API Fix" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Fix: Search user API now filters admin role" -ForegroundColor Yellow
Write-Host "  - Users cannot assign work orders to admin" -ForegroundColor Gray
Write-Host "  - Friendly error message when admin is selected" -ForegroundColor Gray
Write-Host ""

# Upload updated work_orders.py
Write-Host "[1/2] Uploading updated work_orders.py..." -ForegroundColor Yellow
scp app/api/work_orders.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Upload complete!" -ForegroundColor Green
Write-Host ""

# Restart backend service
Write-Host "[2/2] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

Start-Sleep -Seconds 3

# Check service status
Write-Host "Checking service status..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager | head -10"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Backend Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Update:" -ForegroundColor Green
Write-Host "  GET /api/work-orders/search-user-by-name" -ForegroundColor White
Write-Host "  - Now filters out admin users" -ForegroundColor Gray
Write-Host "  - Returns 400 error if admin name is entered" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test frontend app" -ForegroundColor White
Write-Host "  2. Try creating work order with admin name" -ForegroundColor White
Write-Host "  3. Verify error message displays correctly" -ForegroundColor White
Write-Host ""

