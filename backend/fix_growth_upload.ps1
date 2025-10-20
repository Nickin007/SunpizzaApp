# ============================================
#  Fix Growth Data Upload Issue
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Fix Growth Data Upload Issue" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Issue Identified:" -ForegroundColor Red
Write-Host "  1. validate_data() missing 'growth' type support" -ForegroundColor White
Write-Host "  2. API route might not be loaded correctly" -ForegroundColor White
Write-Host ""

# Step 1: Upload fixed excel_parser.py
Write-Host "[1/3] Uploading fixed excel_parser.py..." -ForegroundColor Yellow
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  excel_parser.py uploaded!" -ForegroundColor Green
Write-Host ""

# Step 2: Upload eleme.py (ensure it has growth routes)
Write-Host "[2/3] Uploading eleme.py..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  eleme.py uploaded!" -ForegroundColor Green
Write-Host ""

# Step 3: Restart backend service
Write-Host "[3/3] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Restart failed!" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 3
Write-Host "  Service restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Fix Deployed Successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "What Was Fixed:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] excel_parser.py:" -ForegroundColor Green
Write-Host "      - Added 'growth' type to validate_data() function" -ForegroundColor White
Write-Host "      - Now validates: data_date + store_name for growth data" -ForegroundColor White
Write-Host ""
Write-Host "  [2] eleme.py:" -ForegroundColor Green
Write-Host "      - Re-deployed to ensure all routes are loaded" -ForegroundColor White
Write-Host "      - GET /api/eleme/growth-data route" -ForegroundColor Cyan
Write-Host "      - Upload logic with data_type='growth'" -ForegroundColor White
Write-Host "      - Delete logic for growth data" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 5 seconds for service to fully start" -ForegroundColor Cyan
Write-Host "  2. Delete the failed import record (成功0,失败61)" -ForegroundColor Cyan
Write-Host "  3. Re-upload the Excel file with '商家成长数据' type" -ForegroundColor Cyan
Write-Host "  4. Check import history - should show success" -ForegroundColor Cyan
Write-Host "  5. Go to 'Data View' -> '商家成长数据' tab" -ForegroundColor Cyan
Write-Host "  6. Should see uploaded data with all 61 fields" -ForegroundColor Cyan
Write-Host ""

Write-Host "Verify Backend is Running:" -ForegroundColor Yellow
Write-Host "  ssh ubuntu@118.89.73.199 \"sudo systemctl status sunpizza-backend\"" -ForegroundColor Cyan
Write-Host ""

Write-Host "Check Logs if Still Failing:" -ForegroundColor Yellow
Write-Host "  ssh ubuntu@118.89.73.199 \"sudo journalctl -u sunpizza-backend -n 100\"" -ForegroundColor Cyan
Write-Host ""

