# ============================================
#  Final Fix for Growth Data Type Parsing
#  Server: 118.89.73.199
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Growth Data Type Parsing - Final Fix" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[Step 1/5] Uploading fixed excel_parser.py..." -ForegroundColor Yellow
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/excel_parser.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Upload successful!" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 2/5] Verifying file content on server..." -ForegroundColor Yellow
$result = ssh ubuntu@118.89.73.199 "grep -c '_current' ~/SunpizzaApp/backend/app/services/excel_parser.py"
Write-Host "  Found $_current mentions: $result" -ForegroundColor White
if ($result -gt 0) {
    Write-Host "  File verification passed!" -ForegroundColor Green
} else {
    Write-Host "  WARNING: File may not contain fixes!" -ForegroundColor Red
}
Write-Host ""

Write-Host "[Step 3/5] Stopping backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl stop sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Stop failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Service stopped!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

Write-Host "[Step 4/5] Starting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl start sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Start failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Service started!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 5 seconds for service to fully start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

Write-Host "[Step 5/5] Checking service status..." -ForegroundColor Yellow
$status = ssh ubuntu@118.89.73.199 "sudo systemctl is-active sunpizza-backend"
Write-Host "  Service status: $status" -ForegroundColor White
if ($status -eq "active") {
    Write-Host "  Service is running!" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Service may not be running properly!" -ForegroundColor Red
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Delete the failed import record (61 failed)" -ForegroundColor White
Write-Host "  2. Upload your Excel file again" -ForegroundColor White
Write-Host "  3. Check results:" -ForegroundColor White
Write-Host "     - Success rows should be > 0" -ForegroundColor Green
Write-Host "     - Failed rows should be = 0" -ForegroundColor Green
Write-Host "     - Data view should show actual numbers" -ForegroundColor Green
Write-Host ""

