# ============================================
#  Deploy Review Database
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Review Database" -ForegroundColor Cyan
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
scp deploy/migrate_add_review_table.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/deploy/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Migration script uploaded!" -ForegroundColor Green
Write-Host ""

# Step 4: Run migration
Write-Host "[4/4] Running migration..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "cd ~/SunpizzaApp/backend && source venv/bin/activate && PYTHONPATH=/home/ubuntu/SunpizzaApp/backend python deploy/migrate_add_review_table.py"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Migration complete!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Review Database Structure:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Table: eleme_review_data" -ForegroundColor Cyan
Write-Host "  Total Fields: 19" -ForegroundColor White
Write-Host ""
Write-Host "  [1] Basic Info (4 fields)" -ForegroundColor Green
Write-Host "      - data_date, store_id, store_name, city" -ForegroundColor Gray
Write-Host ""
Write-Host "  [2] Order & Review (2 fields)" -ForegroundColor Green
Write-Host "      - order_id, review_time" -ForegroundColor Gray
Write-Host ""
Write-Host "  [3] Scores (4 fields)" -ForegroundColor Green
Write-Host "      - overall_score, taste_score" -ForegroundColor Gray
Write-Host "      - packaging_score, delivery_score" -ForegroundColor Gray
Write-Host ""
Write-Host "  [4] Content (2 fields)" -ForegroundColor Green
Write-Host "      - review_content, reply_content" -ForegroundColor Gray
Write-Host ""
Write-Host "  [5] Product Feedback (2 fields)" -ForegroundColor Green
Write-Host "      - liked_products, disliked_products" -ForegroundColor Gray
Write-Host ""
Write-Host "  [6] Status (4 fields)" -ForegroundColor Green
Write-Host "      - is_appeal_success, is_counted_in_score" -ForegroundColor Gray
Write-Host "      - is_visible_to_customer, reply_method" -ForegroundColor Gray
Write-Host ""
Write-Host "  [7] Details (1 field)" -ForegroundColor Green
Write-Host "      - order_details" -ForegroundColor Gray
Write-Host ""
Write-Host "Field Mapping:" -ForegroundColor Yellow
Write-Host "  - Excel Parser: REVIEW_FIELD_MAPPING added" -ForegroundColor White
Write-Host "  - Validation: review data type support" -ForegroundColor White
Write-Host "  - Required fields: date, store_name" -ForegroundColor White
Write-Host ""
Write-Host "Deduplication Policy:" -ForegroundColor Yellow
Write-Host "  - NO deduplication (like product data)" -ForegroundColor White
Write-Host "  - All review records preserved" -ForegroundColor White
Write-Host "  - Allows duplicate imports" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update backend API to handle review data upload" -ForegroundColor Cyan
Write-Host "  2. Update frontend to support review type" -ForegroundColor Cyan
Write-Host "  3. Create review data view in DataViewTab" -ForegroundColor Cyan
Write-Host "  4. Test with real review data Excel file" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentation: backend/评价数据库设计.md" -ForegroundColor Gray
Write-Host ""

