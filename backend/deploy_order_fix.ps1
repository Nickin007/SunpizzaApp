# ============================================
#  Deploy Order Data Fix
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Order Data Fix" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Upload backend file
Write-Host "[1/2] Uploading backend file..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

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
Write-Host "  1. Enhanced order_time to data_date extraction" -ForegroundColor White
Write-Host "  2. Support multiple date formats (YYYY-MM-DD, YYYY/MM/DD)" -ForegroundColor White
Write-Host "  3. Added debug logging for data_type parameter" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Upload your CSV file again" -ForegroundColor White
Write-Host "  2. Select 'Order Data' type" -ForegroundColor White
Write-Host "  3. Check backend logs with:" -ForegroundColor White
Write-Host "     ssh ubuntu@118.89.73.199" -ForegroundColor Cyan
Write-Host "     sudo journalctl -u sunpizza-backend -f" -ForegroundColor Cyan
Write-Host ""

