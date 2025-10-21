# Deployment Script: Add Store Name to Order Eleme Data
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Add Store Name to Order Eleme Data" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SERVER_USER = "ubuntu"
$SERVER_IP = "118.89.73.199"
$SERVER_PATH = "/home/ubuntu/SunpizzaApp"
$FRONTEND_IP = "118.25.70.79"
$LOCAL_BACKEND = "C:\Users\YQH20\Desktop\SunpizzaApp\backend"
$LOCAL_FRONTEND = "C:\Users\YQH20\Desktop\SunpizzaApp\admin-web"

# Step 1: Upload backend files
Write-Host "Step 1/5: Uploading backend files..." -ForegroundColor Yellow
Write-Host "  Uploading models.py..."
scp -o StrictHostKeyChecking=no "$LOCAL_BACKEND\app\models.py" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/app/"
Write-Host "  Uploading migration script..."
scp -o StrictHostKeyChecking=no "$LOCAL_BACKEND\deploy\migrate_add_store_name_to_order_eleme.py" "${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/backend/deploy/"
Write-Host "  Backend files uploaded!" -ForegroundColor Green
Write-Host ""

# Step 2: Run database migration
Write-Host "Step 2/5: Running database migration..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_IP}" "cd ${SERVER_PATH}/backend && source venv/bin/activate && python deploy/migrate_add_store_name_to_order_eleme.py"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Migration completed!" -ForegroundColor Green
} else {
    Write-Host "  Migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Restart backend
Write-Host "Step 3/5: Restarting backend..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_IP}" "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 3
Write-Host "  Backend restarted!" -ForegroundColor Green
Write-Host ""

# Step 4: Build and upload frontend
Write-Host "Step 4/5: Building and uploading frontend..." -ForegroundColor Yellow
Set-Location $LOCAL_FRONTEND
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Frontend built!" -ForegroundColor Green
scp -r "dist\*" "ubuntu@${FRONTEND_IP}:/home/ubuntu/SunpizzaApp/admin-web/dist/"
Write-Host "  Frontend uploaded!" -ForegroundColor Green
Write-Host ""

# Step 5: Fix permissions and reload Nginx
Write-Host "Step 5/5: Reloading Nginx..." -ForegroundColor Yellow
ssh "ubuntu@${FRONTEND_IP}" "sudo chown -R www-data:www-data /home/ubuntu/SunpizzaApp/admin-web/dist/ && sudo chmod -R 755 /home/ubuntu/SunpizzaApp/admin-web/dist/ && sudo systemctl reload nginx"
Write-Host "  Nginx reloaded!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "- Added store_name field to eleme_order_eleme_data table" -ForegroundColor White
Write-Host "- Updated frontend data view to display store name" -ForegroundColor White
Write-Host "- When uploading Order Eleme data, make sure Excel has these columns:" -ForegroundColor White
Write-Host "  1. Date (日期)" -ForegroundColor Cyan
Write-Host "  2. Store Name (门店名称)" -ForegroundColor Cyan
Write-Host "  3. Order ID (订单单号)" -ForegroundColor Cyan
Write-Host "  4. Product Info (商品信息)" -ForegroundColor Cyan
Write-Host ""

