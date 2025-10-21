# =========================================
#   Update Active Stores (56 -> 59)
# =========================================

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Update Active Stores List" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Changes:" -ForegroundColor Yellow
Write-Host "  [-] Delete 3 stores (closed/renamed)" -ForegroundColor Red
Write-Host "  [+] Add 6 new stores" -ForegroundColor Green
Write-Host "  Result: 56 -> 59 stores" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload migration script
Write-Host "[1/2] Uploading update script..." -ForegroundColor Yellow
scp deploy/update_active_stores.py ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/backend/deploy/
Write-Host "  Script uploaded!" -ForegroundColor Green

# Step 2: Run update script on server
Write-Host ""
Write-Host "[2/2] Running update script on server..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "cd /home/ubuntu/SunpizzaApp/backend && source venv/bin/activate && python deploy/update_active_stores.py"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Update Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check frontend display" -ForegroundColor White
Write-Host "  2. Verify statistics (Total: 59, Active: 59, Inactive: 0)" -ForegroundColor White
Write-Host "  3. Test filter functionality" -ForegroundColor White
Write-Host ""

