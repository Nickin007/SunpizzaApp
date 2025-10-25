# Deploy Cost Analysis Module to Server
# This script builds the frontend and deploys to the production server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Cost Analysis Module" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
Set-Location -Path "C:\Users\YQH20\Desktop\SunpizzaApp\admin-web"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Upload to server
Write-Host "[2/4] Uploading files to server..." -ForegroundColor Yellow
scp -r dist/* ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/admin-web/dist/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Files uploaded successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Set permissions
Write-Host "[3/4] Setting file permissions..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo chown -R www-data:www-data /home/ubuntu/SunpizzaApp/admin-web/dist && sudo chmod -R 755 /home/ubuntu/SunpizzaApp/admin-web/dist"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Permission setting failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Permissions set successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Reload Nginx
Write-Host "[4/4] Reloading Nginx..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl reload nginx"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Nginx reload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Nginx reloaded successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access the Cost Analysis module at:" -ForegroundColor Cyan
Write-Host "http://118.89.73.199/delivery/eleme/cost-mapping" -ForegroundColor Yellow

