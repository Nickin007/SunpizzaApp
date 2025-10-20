# ============================================
#  Deploy Product Database
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Product Database" -ForegroundColor Cyan
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
scp deploy/migrate_add_product_table.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/deploy/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Migration script uploaded!" -ForegroundColor Green
Write-Host ""

# Step 4: Run migration and restart service
Write-Host "[4/4] Running migration and restarting service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "cd ~/SunpizzaApp/backend && source venv/bin/activate && PYTHONPATH=/home/ubuntu/SunpizzaApp/backend python deploy/migrate_add_product_table.py && sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration or restart failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Migration complete and service restarted!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Product Database Structure:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Table: eleme_product_data" -ForegroundColor Cyan
Write-Host "  Total Fields: 24" -ForegroundColor White
Write-Host ""
Write-Host "  [1] Basic Info (5 fields)" -ForegroundColor Green
Write-Host "      - data_date, city, store_name, store_id, product_name" -ForegroundColor Gray
Write-Host ""
Write-Host "  [2] Product Attributes (5 fields)" -ForegroundColor Green
Write-Host "      - is_new_product, is_signature, is_combo" -ForegroundColor Gray
Write-Host "      - is_ingredient, is_sold_out" -ForegroundColor Gray
Write-Host ""
Write-Host "  [3] Sales Data (5 fields)" -ForegroundColor Green
Write-Host "      - sales_amount, sales_volume, order_user_count" -ForegroundColor Gray
Write-Host "      - order_count, order_transaction_amount" -ForegroundColor Gray
Write-Host ""
Write-Host "  [4] Repurchase Data (2 fields)" -ForegroundColor Green
Write-Host "      - repurchase_30d_users, repurchase_30d_rate" -ForegroundColor Gray
Write-Host ""
Write-Host "  [5] New Customer Data (2 fields)" -ForegroundColor Green
Write-Host "      - new_customer_count, new_customer_ratio" -ForegroundColor Gray
Write-Host ""
Write-Host "  [6] User Behavior (5 fields)" -ForegroundColor Green
Write-Host "      - exposure_users, click_users, add_to_cart_users" -ForegroundColor Gray
Write-Host "      - add_to_cart_rate, like_count" -ForegroundColor Gray
Write-Host ""
Write-Host "Field Mapping Updated:" -ForegroundColor Yellow
Write-Host "  - Excel Parser: PRODUCT_FIELD_MAPPING added" -ForegroundColor White
Write-Host "  - Validation: product data type support" -ForegroundColor White
Write-Host "  - Required fields: date, store_name, product_name" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update backend API to handle product data upload" -ForegroundColor Cyan
Write-Host "  2. Update frontend DataUploadTab to support product type" -ForegroundColor Cyan
Write-Host "  3. Create product data view in DataViewTab" -ForegroundColor Cyan
Write-Host "  4. Test with real product data Excel file" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentation: backend/商品数据库设计.md" -ForegroundColor Gray
Write-Host ""

