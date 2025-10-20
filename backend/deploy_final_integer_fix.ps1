# ============================================
#  Final Fix: Integer Date Support
#  Fix: Excel "常规" format reads as int, not str
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Final Fix: Integer Date Support" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Root Cause:" -ForegroundColor Yellow
Write-Host "  Excel date 20251019 in 'General' format" -ForegroundColor White
Write-Host "  -> pandas reads as int(20251019)" -ForegroundColor White
Write-Host "  -> Our function only handled str and datetime" -ForegroundColor Red
Write-Host "  -> Now added int/float support!" -ForegroundColor Green
Write-Host ""

Write-Host "[1/5] Uploading fixed excel_parser.py..." -ForegroundColor Yellow
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/excel_parser.py
Write-Host "  Upload successful!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/5] Clearing Python cache..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "find ~/SunpizzaApp/backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; find ~/SunpizzaApp/backend -name '*.pyc' -delete 2>/dev/null"
Write-Host "  Cache cleared!" -ForegroundColor Green
Write-Host ""

Write-Host "[3/5] Stopping and killing all processes..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl stop sunpizza-backend; sudo pkill -9 -f gunicorn"
Write-Host "  All stopped!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

Write-Host "[4/5] Starting service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl start sunpizza-backend"
Write-Host "  Service started!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 10 seconds for full startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""

Write-Host "[5/5] Checking status..." -ForegroundColor Yellow
$status = ssh ubuntu@118.89.73.199 "sudo systemctl is-active sunpizza-backend"
Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "active") { "Green" } else { "Red" })
Write-Host ""

if ($status -eq "active") {
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  Deployment Successful!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "NOW TEST:" -ForegroundColor Yellow
    Write-Host "  1. Delete failed record" -ForegroundColor White
    Write-Host "  2. Upload 20251019.xlsx" -ForegroundColor White
    Write-Host "  3. Expected result:" -ForegroundColor White
    Write-Host "     Total: 61, Success: 61, Failed: 0" -ForegroundColor Green
    Write-Host "     Data Date: 2025-10-19" -ForegroundColor Green
    Write-Host "     Store Score: actual value" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Service not active!" -ForegroundColor Red
}

