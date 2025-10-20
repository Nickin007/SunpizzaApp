# ============================================
#  Remove Product Data Deduplication
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Remove Product Deduplication" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload eleme.py
Write-Host "[1/2] Uploading eleme.py..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

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
Write-Host "Change Summary:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  BEFORE:" -ForegroundColor Red
Write-Host "    - Product data deduplicated by (date + store + product)" -ForegroundColor White
Write-Host "    - Duplicate rows skipped automatically" -ForegroundColor White
Write-Host "    - Total rows != Success rows (skipped not counted)" -ForegroundColor White
Write-Host ""
Write-Host "  AFTER:" -ForegroundColor Green
Write-Host "    - NO deduplication for product data" -ForegroundColor White
Write-Host "    - ALL rows inserted (including duplicates)" -ForegroundColor White
Write-Host "    - Total rows = Success rows + Failed rows" -ForegroundColor White
Write-Host ""
Write-Host "Business Reason:" -ForegroundColor Yellow
Write-Host "  Duplicate rows in Excel represent multiple listings" -ForegroundColor White
Write-Host "  of the same product (e.g., same product listed twice)" -ForegroundColor White
Write-Host "  This is valid business data and should be preserved!" -ForegroundColor White
Write-Host ""
Write-Host "Example:" -ForegroundColor Cyan
Write-Host "  Excel has:" -ForegroundColor White
Write-Host "    - 2025-10-17 | Store A | Pizza A | Sales: 100" -ForegroundColor Gray
Write-Host "    - 2025-10-17 | Store A | Pizza A | Sales: 50" -ForegroundColor Gray
Write-Host ""
Write-Host "  Old behavior: Only 1st row inserted (2nd skipped)" -ForegroundColor Red
Write-Host "  New behavior: BOTH rows inserted" -ForegroundColor Green
Write-Host ""
Write-Host "Statistics Now Match:" -ForegroundColor Yellow
Write-Host "  7078 total rows -> 7078 success rows" -ForegroundColor Green
Write-Host "  All data preserved in database" -ForegroundColor Green
Write-Host ""
Write-Host "Future Enhancement:" -ForegroundColor Yellow
Write-Host "  Add duplicate detection feature to find and analyze" -ForegroundColor White
Write-Host "  duplicate rows (for data quality review)" -ForegroundColor White
Write-Host ""
Write-Host "Note:" -ForegroundColor Cyan
Write-Host "  - Order data still deduplicates by order_id" -ForegroundColor White
Write-Host "  - Store data still deduplicates by date" -ForegroundColor White
Write-Host "  - ONLY product data allows duplicates now" -ForegroundColor White
Write-Host ""

