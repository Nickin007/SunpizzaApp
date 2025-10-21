# Verify Active Stores Feature Deployment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verify Active Stores Feature" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check backend
Write-Host "[1/3] Checking backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager | head -10"
Write-Host ""

# Check database
Write-Host "[2/3] Checking database..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 @"
cd ~/SunpizzaApp/backend
source venv/bin/activate
python -c "
from app import create_app, db
from sqlalchemy import text
app = create_app()
with app.app_context():
    result = db.session.execute(text('SELECT COUNT(*) as count FROM eleme_active_stores')).fetchone()
    print(f'Active stores in database: {result[0]}')
    
    # Show first 5 stores
    stores = db.session.execute(text('SELECT store_name, is_active FROM eleme_active_stores LIMIT 5')).fetchall()
    print('\nFirst 5 stores:')
    for store in stores:
        status = '在营' if store[1] else '停业'
        print(f'  - {store[0]} ({status})')
"
"@
Write-Host ""

# Check frontend
Write-Host "[3/3] Checking frontend..." -ForegroundColor Yellow
ssh ubuntu@118.25.70.79 "ls -lh ~/SunpizzaApp/admin-web/dist/ | head -10"
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If everything looks good, visit:" -ForegroundColor Yellow
Write-Host "http://118.25.70.79:3000" -ForegroundColor Cyan
Write-Host ""

