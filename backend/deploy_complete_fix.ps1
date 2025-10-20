# ============================================
#  Complete Fix for Growth Data Upload
#  Fix 1: Type parsing (_current, _target, _weight, store_score)
#  Fix 2: Date format (20251019)
#  Server: 118.89.73.199
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Growth Data Complete Fix Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Fix Content:" -ForegroundColor Yellow
Write-Host "  1. Type parsing for _current, _target, _weight fields" -ForegroundColor Green
Write-Host "  2. Date format support: 20251019" -ForegroundColor Green
Write-Host ""

Write-Host "[1/6] Uploading fixed excel_parser.py..." -ForegroundColor Yellow
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/excel_parser.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Upload successful!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/6] Verifying file content..." -ForegroundColor Yellow
$result1 = ssh ubuntu@118.89.73.199 "grep -c '_current' ~/SunpizzaApp/backend/app/services/excel_parser.py"
$result2 = ssh ubuntu@118.89.73.199 "grep -c '%Y%m%d' ~/SunpizzaApp/backend/app/services/excel_parser.py"
Write-Host "  Type parsing fix: $result1 occurrences" -ForegroundColor White
Write-Host "  Date format fix: $result2 occurrences" -ForegroundColor White
if ([int]$result1 -gt 0 -and [int]$result2 -gt 0) {
    Write-Host "  File verification passed!" -ForegroundColor Green
} else {
    Write-Host "  WARNING: File may be incomplete!" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[3/6] Stopping backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl stop sunpizza-backend"
Write-Host "  Service stopped!" -ForegroundColor Green
Write-Host ""

Write-Host "[4/6] Killing all Gunicorn processes..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo pkill -9 gunicorn 2>/dev/null || true"
Write-Host "  Processes cleared!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

Write-Host "[5/6] Starting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl start sunpizza-backend"
Write-Host "  Service started!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 8 seconds for full startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 8
Write-Host ""

Write-Host "[6/6] Checking service status..." -ForegroundColor Yellow
$status = ssh ubuntu@118.89.73.199 "sudo systemctl is-active sunpizza-backend"
Write-Host "  Service status: $status" -ForegroundColor $(if ($status -eq "active") { "Green" } else { "Red" })
Write-Host ""

if ($status -eq "active") {
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  Deployment Complete!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Test Steps:" -ForegroundColor Yellow
    Write-Host "  1. Delete the failed import record (61 failed)" -ForegroundColor White
    Write-Host "  2. Re-upload your Excel file" -ForegroundColor White
    Write-Host "     - File: 20251019.xlsx" -ForegroundColor Cyan
    Write-Host "     - Data Type: Growth Data" -ForegroundColor Cyan
    Write-Host "  3. Check results:" -ForegroundColor White
    Write-Host "     - Total rows: 61" -ForegroundColor Green
    Write-Host "     - Success rows: 61" -ForegroundColor Green
    Write-Host "     - Failed rows: 0" -ForegroundColor Green
    Write-Host "  4. Open data view to verify:" -ForegroundColor White
    Write-Host "     - Store Score: actual value (not 0.00)" -ForegroundColor Green
    Write-Host "     - Indicator fields: actual values (not -)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Expected Data Sample:" -ForegroundColor Yellow
    Write-Host "  Date: 2025-10-19" -ForegroundColor Cyan
    Write-Host "  Store Name: Your store name" -ForegroundColor Cyan
    Write-Host "  Store Score: 85.50" -ForegroundColor Cyan
    Write-Host "  Peak Hours Current: 12.50" -ForegroundColor Cyan
    Write-Host "  Peak Hours Target: 14.00" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "  Deployment Failed!" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check logs with:" -ForegroundColor Yellow
    Write-Host '  ssh ubuntu@118.89.73.199 "sudo journalctl -u sunpizza-backend -n 50"' -ForegroundColor White
}
Write-Host ""
