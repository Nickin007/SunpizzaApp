# ============================================
#  Deploy Order Data Feature
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Order Data Feature" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload backend files
Write-Host "[1/4] Uploading backend files..." -ForegroundColor Yellow
scp app/models.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload models.py failed!" -ForegroundColor Red
    exit 1
}

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

scp deploy/migrate_add_order_table.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/deploy/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload migration script failed!" -ForegroundColor Red
    exit 1
}

Write-Host "  Upload complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Run database migration
Write-Host "[2/4] Running database migration..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "cd ~/SunpizzaApp/backend && source venv/bin/activate && PYTHONPATH=/home/ubuntu/SunpizzaApp/backend python deploy/migrate_add_order_table.py"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Migration complete!" -ForegroundColor Green
Write-Host ""

# Step 3: Restart backend service
Write-Host "[3/4] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Restart failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Backend service restarted!" -ForegroundColor Green
Write-Host ""

# Step 4: Verify deployment
Write-Host "[4/4] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager | head -n 10"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Order Data Feature Deployed Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Features Implemented:" -ForegroundColor Yellow
Write-Host "  1. ElemeOrderData model (19 fields)" -ForegroundColor White
Write-Host "  2. Order field mapping configuration" -ForegroundColor White
Write-Host "  3. Smart upload logic (store/order auto-detect)" -ForegroundColor White
Write-Host "  4. Smart delete logic (supports order data)" -ForegroundColor White
Write-Host "  5. Database table: eleme_order_data" -ForegroundColor White
Write-Host ""
Write-Host "Testing Steps:" -ForegroundColor Yellow
Write-Host "  1. Select 'Order Data Upload' in frontend" -ForegroundColor White
Write-Host "  2. Upload Shixing order Excel file" -ForegroundColor White
Write-Host "  3. Check success message" -ForegroundColor White
Write-Host "  4. View import history" -ForegroundColor White
Write-Host "  5. Try deleting import record" -ForegroundColor White
Write-Host ""

