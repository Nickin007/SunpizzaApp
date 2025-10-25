# 部署成本分析数据库结构和前后端代码
# 包含：源商品成本库、映射商品库的完整实现

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Deploy Cost Analysis Database" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 服务器配置
$SERVER = "ubuntu@118.89.73.199"
$BACKEND_DIR = "/home/ubuntu/SunpizzaApp/backend"
$FRONTEND_DIR = "/home/ubuntu/SunpizzaApp/admin-web"

# Step 1: Upload migration script
Write-Host "[1/6] Uploading database migration script..." -ForegroundColor Yellow
scp deploy/migrate_add_cost_tables.py "${SERVER}:${BACKEND_DIR}/deploy/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload migration script" -ForegroundColor Red
    exit 1
}
Write-Host "Migration script uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Run migration
Write-Host "[2/6] Running database migration..." -ForegroundColor Yellow
ssh $SERVER "cd ${BACKEND_DIR} && source venv/bin/activate && python deploy/migrate_add_cost_tables.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to run migration" -ForegroundColor Red
    exit 1
}
Write-Host "Database migration completed successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Upload backend models and API
Write-Host "[3/6] Uploading backend code..." -ForegroundColor Yellow
scp app/models.py "${SERVER}:${BACKEND_DIR}/app/"
scp app/api/cost_analysis.py "${SERVER}:${BACKEND_DIR}/app/api/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload backend code" -ForegroundColor Red
    exit 1
}
Write-Host "Backend code uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Restart backend service
Write-Host "[4/6] Restarting backend service..." -ForegroundColor Yellow
ssh $SERVER "sudo systemctl restart sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to restart backend service" -ForegroundColor Red
    exit 1
}
Write-Host "Backend service restarted successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Build and upload frontend
Write-Host "[5/6] Building frontend..." -ForegroundColor Yellow
cd ..\admin-web
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build frontend" -ForegroundColor Red
    cd ..\backend
    exit 1
}
Write-Host "Frontend build completed" -ForegroundColor Green
Write-Host ""

Write-Host "[6/6] Deploying frontend to server..." -ForegroundColor Yellow
scp -r dist/* "${SERVER}:${FRONTEND_DIR}/dist/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy frontend" -ForegroundColor Red
    cd ..\backend
    exit 1
}
Write-Host "Frontend deployed successfully" -ForegroundColor Green
Write-Host ""

cd ..\backend

# Verify backend status
Write-Host "Verifying backend service status..." -ForegroundColor Yellow
ssh $SERVER "sudo systemctl status sunpizza-backend | head -10"
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Deployment Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend updates:" -ForegroundColor Green
Write-Host "  - Database tables: source_cost_library, product_mapping" -ForegroundColor Gray
Write-Host "  - Models: SourceCostLibrary, ProductMapping" -ForegroundColor Gray
Write-Host "  - API endpoints: /source-cost-library, /product-mapping" -ForegroundColor Gray
Write-Host ""
Write-Host "Frontend updates:" -ForegroundColor Green
Write-Host "  - SourceCostLibraryTab: Manage source product costs" -ForegroundColor Gray
Write-Host "  - OrderParseDataTab: Manage product mapping" -ForegroundColor Gray
Write-Host "  - API service: costAnalysis with new endpoints" -ForegroundColor Gray
Write-Host ""
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "You can now manage cost database at: Eleme > Cost Analysis" -ForegroundColor Cyan
Write-Host ""

