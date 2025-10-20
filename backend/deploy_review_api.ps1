# ============================================
#  Deploy Review API
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Review API" -ForegroundColor Cyan
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
Write-Host "      - ElemeReviewData model" -ForegroundColor White
Write-Host ""
Write-Host "  [2] Upload API Updated:" -ForegroundColor Green
Write-Host "      - Support 'review' data type" -ForegroundColor White
Write-Host "      - NO deduplication (like product data)" -ForegroundColor White
Write-Host "      - Auto-extract data_date from review records" -ForegroundColor White
Write-Host ""
Write-Host "  [3] Delete API Updated:" -ForegroundColor Green
Write-Host "      - Support review data deletion by batch_id" -ForegroundColor White
Write-Host ""
Write-Host "Issue Fixed:" -ForegroundColor Yellow
Write-Host "  Problem: Success rows = 0 (no data inserted)" -ForegroundColor Red
Write-Host "  Cause:   Missing 'review' data type handler in upload API" -ForegroundColor Red
Write-Host "  Solution: Added review data insertion logic" -ForegroundColor Green
Write-Host ""
Write-Host "Previous Upload Result:" -ForegroundColor Yellow
Write-Host "  - Total: 47 rows" -ForegroundColor White
Write-Host "  - Success: 0 rows (data not inserted)" -ForegroundColor Red
Write-Host "  - Failed: 0 rows" -ForegroundColor White
Write-Host ""
Write-Host "After Fix - Expected Result:" -ForegroundColor Yellow
Write-Host "  - Total: 47 rows" -ForegroundColor White
Write-Host "  - Success: 47 rows (all data inserted)" -ForegroundColor Green
Write-Host "  - Failed: 0 rows" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Re-upload the review Excel file" -ForegroundColor Cyan
Write-Host "  2. Verify success rows = total rows" -ForegroundColor Cyan
Write-Host "  3. Check data appears in 'Data View' tab" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note:" -ForegroundColor Yellow
Write-Host "  The previous upload created a log record but no data" -ForegroundColor White
Write-Host "  You can delete that failed record and re-upload" -ForegroundColor White
Write-Host ""

