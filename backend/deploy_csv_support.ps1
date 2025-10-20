# ============================================
#  Deploy CSV Support Feature
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy CSV Support Feature" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload backend files
Write-Host "[1/2] Uploading backend files..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload eleme.py failed!" -ForegroundColor Red
    exit 1
}

scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload excel_parser.py failed!" -ForegroundColor Red
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
Write-Host "  Backend service restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Backend Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "CSV Support Features:" -ForegroundColor Yellow
Write-Host "  - Supports .xlsx, .xls, .csv files" -ForegroundColor White
Write-Host "  - Auto-detects CSV encoding (UTF-8/GBK/GB2312)" -ForegroundColor White
Write-Host "  - Compatible with existing Excel processing" -ForegroundColor White
Write-Host ""
Write-Host "Now deploy frontend with:" -ForegroundColor Yellow
Write-Host "  cd ../admin-web" -ForegroundColor White
Write-Host "  .\deploy_csv_support.ps1" -ForegroundColor White
Write-Host ""

