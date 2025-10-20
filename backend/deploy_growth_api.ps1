# ============================================
#  Deploy Growth Data API
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Growth Data API" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload eleme.py
Write-Host "[1/2] Uploading eleme.py API file..." -ForegroundColor Yellow
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
Write-Host "  [1] Import Updated:" -ForegroundColor Green
Write-Host "      - Added ElemeGrowthData model import" -ForegroundColor White
Write-Host ""
Write-Host "  [2] Upload API Enhanced:" -ForegroundColor Green
Write-Host "      - Support data_type='growth'" -ForegroundColor White
Write-Host "      - Insert ElemeGrowthData records" -ForegroundColor White
Write-Host "      - Allow duplicate data (like product/review)" -ForegroundColor White
Write-Host "      - Auto-extract data_date from records" -ForegroundColor White
Write-Host ""
Write-Host "  [3] Delete API Enhanced:" -ForegroundColor Green
Write-Host "      - Support growth data deletion by batch_id" -ForegroundColor White
Write-Host "      - ElemeGrowthData.query.filter_by(import_batch_id)" -ForegroundColor White
Write-Host ""
Write-Host "  [4] New Query API:" -ForegroundColor Green
Write-Host "      - GET /api/eleme/growth-data" -ForegroundColor Cyan
Write-Host "      - Supports filtering:" -ForegroundColor White
Write-Host "        * Date range (start_date, end_date)" -ForegroundColor White
Write-Host "        * Location (province, city, store_id, store_name)" -ForegroundColor White
Write-Host "        * Store rating (min_score, max_score, l_level)" -ForegroundColor White
Write-Host "        * Pagination (page, per_page)" -ForegroundColor White
Write-Host "      - Returns all 61 business fields" -ForegroundColor White
Write-Host "      - Sorted by: data_date DESC, store_score DESC" -ForegroundColor White
Write-Host ""
Write-Host "Test the API:" -ForegroundColor Yellow
Write-Host "  curl -X GET 'http://118.89.73.199:5000/api/eleme/growth-data?page=1&per_page=10' \" -ForegroundColor Cyan
Write-Host "    -H 'Authorization: Bearer YOUR_TOKEN'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Step:" -ForegroundColor Yellow
Write-Host "  Deploy frontend changes:" -ForegroundColor Cyan
Write-Host "  cd admin-web" -ForegroundColor White
Write-Host "  .\deploy_growth_feature.ps1" -ForegroundColor White
Write-Host ""

