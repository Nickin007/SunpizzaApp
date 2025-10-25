# Deploy Cost Analysis - Applied Stores Module
# This script deploys the applied stores functionality for cost analysis

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Cost Analysis - Applied Stores" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload migration script
Write-Host "[1/4] Uploading migration script..." -ForegroundColor Yellow
scp deploy/migrate_add_cost_analysis_field.py ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/backend/deploy/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload migration script failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Migration script uploaded!" -ForegroundColor Green
Write-Host ""

# Step 2: Database migration
Write-Host "[2/4] Running database migration..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "cd /home/ubuntu/SunpizzaApp/backend && source venv/bin/activate && python deploy/migrate_add_cost_analysis_field.py"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Database migration failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Database migration completed!" -ForegroundColor Green
Write-Host ""

# Step 3: Upload backend code
Write-Host "[3/4] Uploading backend code..." -ForegroundColor Yellow
scp app/models.py ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/backend/app/
scp app/__init__.py ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/backend/app/
scp app/api/cost_analysis.py ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/backend/app/api/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Backend code uploaded!" -ForegroundColor Green
Write-Host ""

# Step 4: Restart backend service
Write-Host "[4/4] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend restart failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Backend service restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend deployment completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build and deploy frontend using:" -ForegroundColor White
Write-Host "   cd admin-web && powershell -File deploy_cost_analysis.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "GET    /api/cost-analysis/applied-stores" -ForegroundColor White
Write-Host "POST   /api/cost-analysis/applied-stores" -ForegroundColor White
Write-Host "PUT    /api/cost-analysis/applied-stores/:id" -ForegroundColor White
Write-Host "PUT    /api/cost-analysis/applied-stores/:id/toggle" -ForegroundColor White
Write-Host "DELETE /api/cost-analysis/applied-stores/:id" -ForegroundColor White
Write-Host "GET    /api/cost-analysis/applied-stores/summary" -ForegroundColor White

