# ============================================
#  Deploy Review View Feature
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Review View Feature" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload eleme.py API file
Write-Host "[1/2] Uploading backend API file..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  eleme.py uploaded!" -ForegroundColor Green
Write-Host ""

# Step 2: Restart backend service
Write-Host "[2/2] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Restart failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Service restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Backend Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend Updates:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] New API Endpoint:" -ForegroundColor Green
Write-Host "      - GET /api/eleme/review-data" -ForegroundColor White
Write-Host "      - Supports filtering by date, city, store, order, score" -ForegroundColor White
Write-Host "      - Returns paginated review data with all 19 fields" -ForegroundColor White
Write-Host ""
Write-Host "Next Step:" -ForegroundColor Yellow
Write-Host "  Run frontend deployment script:" -ForegroundColor Cyan
Write-Host "  cd admin-web" -ForegroundColor White
Write-Host "  .\deploy_review_view.ps1" -ForegroundColor White
Write-Host ""

