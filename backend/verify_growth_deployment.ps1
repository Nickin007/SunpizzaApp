# ============================================
#  Verify & Fix Growth Data Deployment
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Verify Growth Data Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if route exists in eleme.py
Write-Host "[1/5] Checking backend code..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "grep -n 'growth-data' ~/SunpizzaApp/backend/app/api/eleme.py | head -5"
Write-Host ""

# Step 2: Check if ElemeGrowthData is imported
Write-Host "[2/5] Checking imports..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "grep -n 'ElemeGrowthData' ~/SunpizzaApp/backend/app/api/eleme.py | head -2"
Write-Host ""

# Step 3: Re-upload files to ensure they're correct
Write-Host "[3/5] Re-uploading backend files..." -ForegroundColor Yellow
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/
Write-Host "  eleme.py uploaded!" -ForegroundColor Green
Write-Host ""

# Step 4: Restart backend service
Write-Host "[4/5] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 3
Write-Host "  Service restarted!" -ForegroundColor Green
Write-Host ""

# Step 5: Check service status
Write-Host "[5/5] Checking service status..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager -l | head -20"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Verification Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 5 seconds for service to fully start" -ForegroundColor White
Write-Host "  2. Check backend logs:" -ForegroundColor White
Write-Host "     ssh ubuntu@118.89.73.199 \"sudo journalctl -u sunpizza-backend -n 50\"" -ForegroundColor Cyan
Write-Host "  3. Test upload again with growth data" -ForegroundColor White
Write-Host ""

