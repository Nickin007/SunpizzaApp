# Order Data Split Feature - Complete Deployment Script
# Split order data into: Order Data (Shiheng) and Order Data (Eleme)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Order Split Feature - Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$SERVER_PATH = "~/SunpizzaApp/backend"

# 1. Upload backend files
Write-Host "Step 1/6: Uploading backend files..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  - Uploading models.py (ElemeOrderElemeData model)..." -ForegroundColor Gray
scp app/models.py "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/app/"
Write-Host "    Done: models.py uploaded" -ForegroundColor Green

Write-Host "  - Uploading excel_parser.py (Eleme order field mapping)..." -ForegroundColor Gray
scp app/services/excel_parser.py "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/app/services/"
Write-Host "    Done: excel_parser.py uploaded" -ForegroundColor Green

Write-Host "  - Uploading eleme.py (Eleme order API)..." -ForegroundColor Gray
scp app/api/eleme.py "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/app/api/"
Write-Host "    Done: eleme.py uploaded" -ForegroundColor Green

Write-Host "  - Uploading migration script..." -ForegroundColor Gray
scp deploy/migrate_add_order_eleme_table.py "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/deploy/"
Write-Host "    Done: Migration script uploaded" -ForegroundColor Green

Write-Host ""
Write-Host "Step 1/6 completed" -ForegroundColor Green
Write-Host ""

# 2. Run database migration
Write-Host "Step 2/6: Running database migration..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Running migration script..." -ForegroundColor Gray
ssh "${SERVER_USER}@${SERVER_IP}" "cd ~/SunpizzaApp/backend && source venv/bin/activate && python deploy/migrate_add_order_eleme_table.py"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Step 2/6 completed - Database migration successful" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 2/6 failed - Database migration error" -ForegroundColor Red
    Write-Host "Please check the error and fix manually" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 3. Clean Python cache
Write-Host "Step 3/6: Cleaning Python cache..." -ForegroundColor Yellow
Write-Host ""

ssh "${SERVER_USER}@${SERVER_IP}" "cd ~/SunpizzaApp/backend && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true && find . -type f -name '*.pyc' -delete 2>/dev/null || true && echo 'Python cache cleaned'"
Write-Host ""
Write-Host "Step 3/6 completed" -ForegroundColor Green
Write-Host ""

# 4. Restart backend service
Write-Host "Step 4/6: Restarting backend service..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Stopping service..." -ForegroundColor Gray
ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl stop sunpizza-backend"
Start-Sleep -Seconds 2

Write-Host "  Starting service..." -ForegroundColor Gray
ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl start sunpizza-backend"
Start-Sleep -Seconds 3

Write-Host "  Checking service status..." -ForegroundColor Gray
$status = ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl is-active sunpizza-backend"

if ($status -eq "active") {
    Write-Host ""
    Write-Host "Step 4/6 completed - Backend service is running" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 4/6 failed - Backend service failed to start" -ForegroundColor Red
    Write-Host "Check logs: ssh ubuntu@118.89.73.199 'sudo journalctl -u sunpizza-backend -n 50'" -ForegroundColor Yellow
}
Write-Host ""

# 5. Build frontend
Write-Host "Step 5/6: Building frontend..." -ForegroundColor Yellow
Write-Host ""

Set-Location ..
cd admin-web
Write-Host "  Running npm run build..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Step 5/6 completed - Frontend build successful" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 5/6 failed - Frontend build error" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 6. Deploy frontend
Write-Host "Step 6/6: Deploying frontend..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Compressing frontend files..." -ForegroundColor Gray
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
Write-Host "    Done: Compression complete" -ForegroundColor Green

Write-Host "  Uploading to server..." -ForegroundColor Gray
scp dist.zip ubuntu@118.25.70.79:~/
Write-Host "    Done: Upload complete" -ForegroundColor Green

Write-Host "  Deploying to target directory..." -ForegroundColor Gray
ssh ubuntu@118.25.70.79 "cd /home/ubuntu/SunpizzaApp/admin-web && rm -rf dist && mkdir -p dist && unzip -o ~/dist.zip -d dist && rm ~/dist.zip && sudo chown -R www-data:www-data dist && sudo chmod -R 755 dist && sudo systemctl reload nginx && echo 'Frontend deployed'"

Write-Host ""
Write-Host "Step 6/6 completed - Frontend deployment successful" -ForegroundColor Green
Write-Host ""

# Done
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Deployment Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  * Order data split: Order (Shiheng) and Order (Eleme)" -ForegroundColor White
Write-Host "  * Eleme order: 3 columns (date, order_id, product_info)" -ForegroundColor White
Write-Host "  * Data upload: Added 2 order data type options" -ForegroundColor White
Write-Host "  * Data view: Added 2 order data tabs" -ForegroundColor White
Write-Host "  * Upload calendar: Updated to show 7 data types" -ForegroundColor White
Write-Host ""
Write-Host "Access URL: http://118.25.70.79:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tips:" -ForegroundColor Yellow
Write-Host "  * Hard refresh browser if no updates: Ctrl+Shift+R" -ForegroundColor Gray
Write-Host "  * Backend logs: ssh ubuntu@118.89.73.199 'sudo journalctl -u sunpizza-backend -f'" -ForegroundColor Gray
Write-Host ""

# Return to original directory
cd ..
cd backend
