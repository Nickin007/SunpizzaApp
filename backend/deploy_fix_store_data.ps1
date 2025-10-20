# ============================================
#  Fix Store Data Display - Deploy to Server
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Fix Store Data Display" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload models.py
Write-Host "[1/2] Uploading backend files..." -ForegroundColor Yellow
scp app/models.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Upload complete!" -ForegroundColor Green
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
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Fixed Issue:" -ForegroundColor Yellow
Write-Host "  ElemeStoreDailyData.to_dict() method updated" -ForegroundColor White
Write-Host "  - Before: Only 12 fields returned" -ForegroundColor Red
Write-Host "  - After:  All 90+ fields returned" -ForegroundColor Green
Write-Host ""
Write-Host "Updated to_dict() to include:" -ForegroundColor Yellow
Write-Host "  - Basic Info (9 fields)" -ForegroundColor White
Write-Host "  - Business Hours (4 fields)" -ForegroundColor White
Write-Host "  - Order & Finance (11 fields)" -ForegroundColor White
Write-Host "  - Marketing Funnel (18 fields)" -ForegroundColor White
Write-Host "  - Product Operation (10 fields)" -ForegroundColor White
Write-Host "  - Service Quality (12 fields)" -ForegroundColor White
Write-Host "  - Ratings (4 fields)" -ForegroundColor White
Write-Host "  - 60-Day Reviews (11 fields)" -ForegroundColor White
Write-Host "  - 30-Day Reviews (11 fields)" -ForegroundColor White
Write-Host ""
Write-Host "Test:" -ForegroundColor Yellow
Write-Host "  1. Go to: http://118.25.70.79" -ForegroundColor Cyan
Write-Host "  2. Navigate: Delivery > Eleme > Data Upload > Data View" -ForegroundColor Cyan
Write-Host "  3. Click 'Store Data' tab" -ForegroundColor Cyan
Write-Host "  4. Verify all columns now show data" -ForegroundColor Cyan
Write-Host ""

