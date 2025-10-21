# Quick Deploy Script - Manual Steps with Password
# Password: YYyy1q2w3e

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Quick Deployment Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Password for all steps: YYyy1q2w3e" -ForegroundColor Yellow
Write-Host ""

# Step 1: Upload migration script
Write-Host "Step 1: Uploading migration script..." -ForegroundColor Cyan
Write-Host "Press Enter to continue, then enter password when prompted" -ForegroundColor Gray
pause
scp deploy/migrate_add_order_eleme_table.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/deploy/
Write-Host ""

# Step 2: Run migration
Write-Host "Step 2: Running database migration..." -ForegroundColor Cyan
Write-Host "Press Enter to continue, then enter password when prompted" -ForegroundColor Gray
pause
ssh ubuntu@118.89.73.199 "cd ~/SunpizzaApp/backend && source venv/bin/activate && python deploy/migrate_add_order_eleme_table.py"
Write-Host ""

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration failed! Please check the error." -ForegroundColor Red
    exit 1
}

# Step 3: Restart backend
Write-Host "Step 3: Restarting backend service..." -ForegroundColor Cyan
Write-Host "Press Enter to continue, then enter password when prompted" -ForegroundColor Gray
pause
ssh ubuntu@118.89.73.199 "cd ~/SunpizzaApp/backend && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true && find . -type f -name '*.pyc' -delete 2>/dev/null || true && sudo systemctl restart sunpizza-backend && sleep 3 && sudo systemctl is-active sunpizza-backend"
Write-Host ""

# Step 4: Build and deploy frontend
Write-Host "Step 4: Building frontend..." -ForegroundColor Cyan
cd ../admin-web
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 5: Deploying frontend..." -ForegroundColor Cyan
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force

Write-Host "Press Enter to upload frontend, then enter password when prompted" -ForegroundColor Gray
pause
scp dist.zip ubuntu@118.25.70.79:~/

Write-Host "Press Enter to deploy frontend, then enter password when prompted" -ForegroundColor Gray
pause
ssh ubuntu@118.25.70.79 "cd /home/ubuntu/SunpizzaApp/admin-web && rm -rf dist && mkdir -p dist && unzip -o ~/dist.zip -d dist && rm ~/dist.zip && sudo chown -R www-data:www-data dist && sudo chmod -R 755 dist && sudo systemctl reload nginx"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URL: http://118.25.70.79:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tip: Run setup_ssh_key.ps1 to avoid entering passwords in the future" -ForegroundColor Yellow
Write-Host ""

cd ../backend

