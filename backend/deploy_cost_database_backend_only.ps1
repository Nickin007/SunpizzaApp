# 部署成本分析数据库结构和后端代码（仅后端）
# 包含：源商品成本库、映射商品库的后端实现

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Deploy Cost Database (Backend Only)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 服务器配置
$SERVER = "ubuntu@118.89.73.199"
$BACKEND_DIR = "/home/ubuntu/SunpizzaApp/backend"

# Step 1: Upload migration script
Write-Host "[1/4] Uploading database migration script..." -ForegroundColor Yellow
scp deploy/migrate_add_cost_tables.py "${SERVER}:${BACKEND_DIR}/deploy/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload migration script" -ForegroundColor Red
    exit 1
}
Write-Host "Migration script uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Run migration
Write-Host "[2/4] Running database migration..." -ForegroundColor Yellow
ssh $SERVER "cd ${BACKEND_DIR} && source venv/bin/activate && python deploy/migrate_add_cost_tables.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to run migration" -ForegroundColor Red
    exit 1
}
Write-Host "Database migration completed successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Upload backend models and API
Write-Host "[3/4] Uploading backend code..." -ForegroundColor Yellow
scp app/models.py "${SERVER}:${BACKEND_DIR}/app/"
scp app/api/cost_analysis.py "${SERVER}:${BACKEND_DIR}/app/api/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload backend code" -ForegroundColor Red
    exit 1
}
Write-Host "Backend code uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Restart backend service
Write-Host "[4/4] Restarting backend service..." -ForegroundColor Yellow
ssh $SERVER "sudo systemctl restart sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to restart backend service" -ForegroundColor Red
    exit 1
}
Write-Host "Backend service restarted successfully" -ForegroundColor Green
Write-Host ""

# Verify backend status
Write-Host "Verifying backend service status..." -ForegroundColor Yellow
ssh $SERVER "sudo systemctl status sunpizza-backend | head -10"
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Backend Deployment Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database updates:" -ForegroundColor Green
Write-Host "  - New table: source_cost_library" -ForegroundColor Gray
Write-Host "    Columns: id, source_product_name, source_product_sku," -ForegroundColor Gray
Write-Host "             category, cost, is_deleted, created_at, updated_at" -ForegroundColor Gray
Write-Host ""
Write-Host "  - New table: product_mapping" -ForegroundColor Gray
Write-Host "    Columns: id, parsed_product_name, source_product_name," -ForegroundColor Gray
Write-Host "             source_product_sku, is_deleted, created_at, updated_at" -ForegroundColor Gray
Write-Host ""
Write-Host "API endpoints:" -ForegroundColor Green
Write-Host "  - GET    /api/cost-analysis/source-cost-library" -ForegroundColor Gray
Write-Host "  - POST   /api/cost-analysis/source-cost-library" -ForegroundColor Gray
Write-Host "  - PUT    /api/cost-analysis/source-cost-library/:id" -ForegroundColor Gray
Write-Host "  - DELETE /api/cost-analysis/source-cost-library/:id" -ForegroundColor Gray
Write-Host "  - GET    /api/cost-analysis/source-cost-library/categories" -ForegroundColor Gray
Write-Host ""
Write-Host "  - GET    /api/cost-analysis/product-mapping" -ForegroundColor Gray
Write-Host "  - POST   /api/cost-analysis/product-mapping" -ForegroundColor Gray
Write-Host "  - PUT    /api/cost-analysis/product-mapping/:id" -ForegroundColor Gray
Write-Host "  - DELETE /api/cost-analysis/product-mapping/:id" -ForegroundColor Gray
Write-Host ""
Write-Host "Backend deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Build frontend: cd ..\admin-web && npm run build" -ForegroundColor Yellow
Write-Host "  2. Deploy frontend separately to your frontend server" -ForegroundColor Yellow
Write-Host ""

