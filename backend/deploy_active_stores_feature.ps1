# Deploy Active Stores Feature
# This script deploys the complete active stores feature

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Active Stores Feature" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$BACKEND_SERVER = "ubuntu@118.89.73.199"
$FRONTEND_SERVER = "ubuntu@118.25.70.79"
$BACKEND_PATH = "~/SunpizzaApp/backend"
$FRONTEND_PATH = "~/SunpizzaApp/admin-web"

# Step 1: Upload backend files
Write-Host "[Step 1/8] Uploading backend files..." -ForegroundColor Yellow
Write-Host "Uploading models.py..." -ForegroundColor Gray
scp app/models.py ${BACKEND_SERVER}:${BACKEND_PATH}/app/

Write-Host "Uploading eleme.py..." -ForegroundColor Gray
scp app/api/eleme.py ${BACKEND_SERVER}:${BACKEND_PATH}/app/api/

Write-Host "Uploading migration script..." -ForegroundColor Gray
scp deploy/migrate_add_active_stores.py ${BACKEND_SERVER}:${BACKEND_PATH}/deploy/

Write-Host "Backend files uploaded successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Run database migration
Write-Host "[Step 2/8] Running database migration..." -ForegroundColor Yellow
ssh $BACKEND_SERVER "cd $BACKEND_PATH && source venv/bin/activate && python deploy/migrate_add_active_stores.py"
Write-Host "Database migration completed!" -ForegroundColor Green
Write-Host ""

# Step 3: Clear Python cache
Write-Host "[Step 3/8] Clearing Python cache..." -ForegroundColor Yellow
ssh $BACKEND_SERVER "find $BACKEND_PATH -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true"
ssh $BACKEND_SERVER "find $BACKEND_PATH -type f -name '*.pyc' -delete 2>/dev/null || true"
Write-Host "Python cache cleared!" -ForegroundColor Green
Write-Host ""

# Step 4: Restart backend service
Write-Host "[Step 4/8] Restarting backend service..." -ForegroundColor Yellow
ssh $BACKEND_SERVER "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 3
Write-Host "Backend service restarted!" -ForegroundColor Green
Write-Host ""

# Step 5: Check backend service status
Write-Host "[Step 5/8] Checking backend service status..." -ForegroundColor Yellow
ssh $BACKEND_SERVER "sudo systemctl status sunpizza-backend --no-pager -l | head -20"
Write-Host ""

# Step 6: Build frontend
Write-Host "[Step 6/8] Building frontend..." -ForegroundColor Yellow
Set-Location -Path "../admin-web"
Write-Host "Running npm install..." -ForegroundColor Gray
npm install
Write-Host "Running npm run build..." -ForegroundColor Gray
npm run build
Write-Host "Frontend build completed!" -ForegroundColor Green
Write-Host ""

# Step 7: Deploy frontend
Write-Host "[Step 7/8] Deploying frontend..." -ForegroundColor Yellow
Write-Host "Creating dist.zip..." -ForegroundColor Gray
if (Test-Path "dist.zip") {
    Remove-Item "dist.zip" -Force
}
Compress-Archive -Path "dist\*" -DestinationPath "dist.zip"

Write-Host "Uploading dist.zip to frontend server..." -ForegroundColor Gray
scp dist.zip ${FRONTEND_SERVER}:/tmp/

Write-Host "Deploying on frontend server..." -ForegroundColor Gray
ssh $FRONTEND_SERVER @"
    cd $FRONTEND_PATH
    sudo rm -rf dist/*
    sudo unzip -o /tmp/dist.zip -d dist/
    sudo chown -R ubuntu:ubuntu dist/
    sudo chmod -R 755 dist/
    sudo nginx -t && sudo systemctl reload nginx
    rm /tmp/dist.zip
"@

Write-Host "Frontend deployed successfully!" -ForegroundColor Green
Write-Host ""

# Step 8: Cleanup
Write-Host "[Step 8/8] Cleaning up..." -ForegroundColor Yellow
Set-Location -Path "../backend"
if (Test-Path "../admin-web/dist.zip") {
    Remove-Item "../admin-web/dist.zip" -Force
}
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit http://118.25.70.79:3000" -ForegroundColor Gray
Write-Host "2. Go to 'Delivery Management - Eleme - Data Upload'" -ForegroundColor Gray
Write-Host "3. Click on the '🏪 Active Store List' tab" -ForegroundColor Gray
Write-Host "4. You should see 56 stores already initialized" -ForegroundColor Gray
Write-Host ""

