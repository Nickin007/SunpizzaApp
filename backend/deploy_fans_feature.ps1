# ============================================
#  Deploy Fans Data Feature
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Fans Data Feature" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Feature Summary:" -ForegroundColor Yellow
Write-Host "  - Database Model: ElemeFansData (37 fields)" -ForegroundColor White
Write-Host "  - Field Mapping: FANS_FIELD_MAPPING" -ForegroundColor White
Write-Host "  - API: /api/eleme/fans-data" -ForegroundColor White
Write-Host ""

Write-Host "[1/7] Uploading backend files..." -ForegroundColor Yellow
scp app/models.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/
scp app/api/eleme.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/
scp deploy/migrate_add_fans_table.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/deploy/
Write-Host "  Files uploaded!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/7] Running database migration..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "cd ~/SunpizzaApp/backend && source venv/bin/activate && python deploy/migrate_add_fans_table.py"
Write-Host ""

Write-Host "[3/7] Clearing Python cache..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "find ~/SunpizzaApp/backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; find ~/SunpizzaApp/backend -name '*.pyc' -delete 2>/dev/null"
Write-Host "  Cache cleared!" -ForegroundColor Green
Write-Host ""

Write-Host "[4/7] Stopping backend..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl stop sunpizza-backend; sudo pkill -9 -f gunicorn"
Write-Host "  Backend stopped!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

Write-Host "[5/7] Starting backend..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl start sunpizza-backend"
Write-Host "  Backend started!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 10 seconds for full startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""

Write-Host "[6/7] Checking service status..." -ForegroundColor Yellow
$status = ssh ubuntu@118.89.73.199 "sudo systemctl is-active sunpizza-backend"
Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "active") { "Green" } else { "Red" })
Write-Host ""

Write-Host "[7/7] Verifying database table..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "mysql -u root -p'Qq20021120' sunpizza_db -e \"SHOW TABLES LIKE 'eleme_fans_data';\" 2>/dev/null"
Write-Host ""

if ($status -eq "active") {
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  Backend Deployment Complete!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "✅ Completed:" -ForegroundColor Green
    Write-Host "  1. Database model: ElemeFansData" -ForegroundColor White
    Write-Host "  2. Field mapping: FANS_FIELD_MAPPING (37 fields)" -ForegroundColor White
    Write-Host "  3. Database table: eleme_fans_data" -ForegroundColor White
    Write-Host "  4. Upload API: added fans data insert logic" -ForegroundColor White
    Write-Host "  5. Delete API: added fans data delete logic" -ForegroundColor White
    Write-Host "  6. View API: /api/eleme/fans-data" -ForegroundColor White
    Write-Host ""
    
    Write-Host "⏭️  Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Update frontend (manually or script)" -ForegroundColor White
    Write-Host "     - Add 'fans' to DATA_TYPE_OPTIONS" -ForegroundColor Cyan
    Write-Host "     - Add fansColumns definition" -ForegroundColor Cyan
    Write-Host "     - Add getFansData API call" -ForegroundColor Cyan
    Write-Host "  2. Test upload with Excel file" -ForegroundColor White
    Write-Host "  3. Verify data in Data View tab" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📋 Frontend Files to Update:" -ForegroundColor Yellow
    Write-Host "  - admin-web/src/api/eleme.ts" -ForegroundColor Cyan
    Write-Host "  - admin-web/src/pages/Delivery/Analysis/Eleme/components/DataUploadTab.tsx" -ForegroundColor Cyan
    Write-Host "  - admin-web/src/pages/Delivery/Analysis/Eleme/components/DataViewTab.tsx" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📄 See detailed frontend code in:" -ForegroundColor Yellow
    Write-Host "  backend/粉丝群数据完整部署指南.md" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "  Deployment Failed!" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
}

