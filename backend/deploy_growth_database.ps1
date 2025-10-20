# ============================================
#  Deploy Growth Data Database
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Growth Data Database" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload models.py
Write-Host "[1/4] Uploading models.py..." -ForegroundColor Yellow
scp app/models.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  models.py uploaded!" -ForegroundColor Green
Write-Host ""

# Step 2: Upload excel_parser.py
Write-Host "[2/4] Uploading excel_parser.py..." -ForegroundColor Yellow
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  excel_parser.py uploaded!" -ForegroundColor Green
Write-Host ""

# Step 3: Upload migration script
Write-Host "[3/4] Uploading migration script..." -ForegroundColor Yellow
scp deploy/migrate_add_growth_table.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/deploy/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Migration script uploaded!" -ForegroundColor Green
Write-Host ""

# Step 4: Run migration
Write-Host "[4/4] Running database migration..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "cd ~/SunpizzaApp/backend && source venv/bin/activate && PYTHONPATH=/home/ubuntu/SunpizzaApp/backend python deploy/migrate_add_growth_table.py"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Migration complete!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Database Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Changes Deployed:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] Database Model:" -ForegroundColor Green
Write-Host "      - ElemeGrowthData (61 business fields)" -ForegroundColor White
Write-Host "      - 8 basic info fields" -ForegroundColor White
Write-Host "      - 2 store rating fields" -ForegroundColor White
Write-Host "      - 51 indicator fields (12 groups x 4 + 1 group x 3)" -ForegroundColor White
Write-Host ""
Write-Host "  [2] Field Mapping:" -ForegroundColor Green
Write-Host "      - GROWTH_FIELD_MAPPING (61 fields)" -ForegroundColor White
Write-Host "      - Excel column -> Database field mapping" -ForegroundColor White
Write-Host ""
Write-Host "  [3] Database Table:" -ForegroundColor Green
Write-Host "      - Table: eleme_growth_data" -ForegroundColor White
Write-Host "      - 63 total fields (61 business + 2 metadata)" -ForegroundColor White
Write-Host "      - 7 indexes for performance" -ForegroundColor White
Write-Host ""
Write-Host "Field Categories:" -ForegroundColor Yellow
Write-Host "  - Basic Info: date, store_name, store_id, province, city, etc." -ForegroundColor Cyan
Write-Host "  - Store Rating: l_level, store_score" -ForegroundColor Cyan
Write-Host "  - Peak Hours (7d): current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Business Hours (7d): current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Store Decoration: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Min Delivery Price: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Service Features: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Promotion Richness: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Negative Reply Rate (7d): current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Merchant Rating: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Online Reply Rate (7d): current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Quality Product Rate: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Menu Richness: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Merchant Cancel Rate: current, target, score, weight" -ForegroundColor Cyan
Write-Host "  - Meal Report Rate (7d): current, target, score (no weight)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update backend API (eleme.py)" -ForegroundColor White
Write-Host "     - Add growth data upload logic" -ForegroundColor White
Write-Host "     - Add growth data query API" -ForegroundColor White
Write-Host "  2. Update frontend" -ForegroundColor White
Write-Host "     - Add growth data upload UI" -ForegroundColor White
Write-Host "     - Add growth data view UI (61 columns)" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - backend/商家成长数据库设计.md" -ForegroundColor Cyan
Write-Host ""

