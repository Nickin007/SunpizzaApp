# ============================================
#  Deploy DateTime Fix
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy DateTime Fix" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Upload backend file
Write-Host "[1/2] Uploading backend file..." -ForegroundColor Yellow
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/

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
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Improvements:" -ForegroundColor Yellow
Write-Host "  - Enhanced datetime parsing for CSV files" -ForegroundColor White
Write-Host "  - Support formats:" -ForegroundColor White
Write-Host "    * YYYY-MM-DD HH:MM:SS" -ForegroundColor Cyan
Write-Host "    * YYYY/MM/DD HH:MM:SS" -ForegroundColor Cyan
Write-Host "    * YYYY/MM/DD HH:MM" -ForegroundColor Cyan
Write-Host "    * YYYY-MM-DD HH:MM" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Upload another CSV to test data_date display!" -ForegroundColor Yellow
Write-Host ""

