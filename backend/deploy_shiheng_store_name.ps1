# PowerShell Deployment Script for Adding Shiheng Store Name Field
# Usage: .\deploy_shiheng_store_name.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment: Add Shiheng Store Name Field" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER_USER = "ubuntu"
$SERVER_IP = "118.89.73.199"
$SERVER_PATH = "/home/ubuntu/SunpizzaApp"
$LOCAL_BACKEND = "C:\Users\YQH20\Desktop\SunpizzaApp\backend"
$LOCAL_FRONTEND = "C:\Users\YQH20\Desktop\SunpizzaApp\admin-web"

# Step 1: Upload backend files
Write-Host "Step 1/5: Uploading backend files..." -ForegroundColor Yellow
Write-Host "  Uploading models.py..."
scp -o StrictHostKeyChecking=no "$LOCAL_BACKEND\app\models.py" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/app/"
Write-Host "  Uploading migration script..."
scp -o StrictHostKeyChecking=no "$LOCAL_BACKEND\deploy\migrate_add_shiheng_store_name.py" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/deploy/"
Write-Host "  Backend files uploaded successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Run database migration
Write-Host "Step 2/5: Running database migration..." -ForegroundColor Yellow
Write-Host "  Executing migration script..."
ssh "${SERVER_USER}@${SERVER_IP}" "cd ${SERVER_PATH}/backend && source venv/bin/activate && python deploy/migrate_add_shiheng_store_name.py"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "  Migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Restart backend service
Write-Host "Step 3/5: Restarting backend service..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl restart sunpizza-backend"
Write-Host "  Waiting for service to start..."
Start-Sleep -Seconds 3
$status = ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl is-active sunpizza-backend"
if ($status -eq "active") {
    Write-Host "  Backend service restarted successfully!" -ForegroundColor Green
} else {
    Write-Host "  Backend service failed to start!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Build and upload frontend
Write-Host "Step 4/5: Building and uploading frontend..." -ForegroundColor Yellow
Write-Host "  Building frontend..."
Set-Location $LOCAL_FRONTEND
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Frontend build completed!" -ForegroundColor Green
Write-Host "  Uploading frontend files..."
scp -o StrictHostKeyChecking=no -r "dist\*" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/admin-web/dist/"
Write-Host "  Frontend files uploaded successfully!" -ForegroundColor Green
Write-Host ""

# Step 5: Reload Nginx
Write-Host "Step 5/5: Reloading Nginx..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_IP}" "sudo nginx -t && sudo systemctl reload nginx"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Nginx reloaded successfully!" -ForegroundColor Green
} else {
    Write-Host "  Nginx reload failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please verify the deployment:" -ForegroundColor Yellow
Write-Host "1. Check active stores list shows both Eleme and Shiheng store names" -ForegroundColor White
Write-Host "2. Test creating/editing stores with both name fields" -ForegroundColor White
Write-Host ""

