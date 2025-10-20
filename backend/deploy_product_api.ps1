# ============================================
#  Deploy Product API
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Product API" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload eleme.py API file
Write-Host "[1/2] Uploading eleme API..." -ForegroundColor Yellow
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
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API Updates:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] Import Added:" -ForegroundColor Green
Write-Host "      - ElemeProductData model" -ForegroundColor White
Write-Host ""
Write-Host "  [2] Upload API Updated:" -ForegroundColor Green
Write-Host "      - Support 'product' data type" -ForegroundColor White
Write-Host "      - Deduplication by (date + store + product name)" -ForegroundColor White
Write-Host "      - Auto-skip duplicate products" -ForegroundColor White
Write-Host ""
Write-Host "  [3] Delete API Updated:" -ForegroundColor Green
Write-Host "      - Support product data deletion by batch_id" -ForegroundColor White
Write-Host ""
Write-Host "  [4] New API Endpoint:" -ForegroundColor Green
Write-Host "      GET /api/eleme/product-data" -ForegroundColor Cyan
Write-Host "      - Pagination support" -ForegroundColor White
Write-Host "      - Filters: date, city, store, product name" -ForegroundColor White
Write-Host "      - Filters: is_new_product, is_signature" -ForegroundColor White
Write-Host "      - Sorting: by date DESC, sales DESC" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test product data upload in admin-web" -ForegroundColor Cyan
Write-Host "  2. Verify data appears in import history" -ForegroundColor Cyan
Write-Host "  3. Update frontend to add product data view" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Upload:" -ForegroundColor Yellow
Write-Host "  - Select data type: 'Product Data'" -ForegroundColor White
Write-Host "  - Upload product Excel/CSV file" -ForegroundColor White
Write-Host "  - Check import history for success" -ForegroundColor White
Write-Host ""

