# Deploy database changes and import Excel data

Write-Host "============================================"
Write-Host "Database Deployment and Data Import Script"
Write-Host "============================================"
Write-Host ""

$SERVER = "ubuntu@118.89.73.199"
$BACKEND_PATH = "/home/ubuntu/SunpizzaApp/backend"
$PROJECT_ROOT = "C:/Users/YQH20/Desktop/SunpizzaApp"

# Step 1: Upload migration script
Write-Host "Step 1: Uploading migration script..."
scp backend/deploy/migrate_remove_columns.py ${SERVER}:${BACKEND_PATH}/deploy/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload migration script"
    exit 1
}
Write-Host "SUCCESS: Migration script uploaded"
Write-Host ""

# Step 2: Run migration
Write-Host "Step 2: Running database migration..."
ssh $SERVER "cd $BACKEND_PATH; source venv/bin/activate; python deploy/migrate_remove_columns.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed"
    exit 1
}
Write-Host "SUCCESS: Migration completed"
Write-Host ""

# Step 3: Upload updated models.py
Write-Host "Step 3: Uploading updated models.py..."
scp backend/app/models.py ${SERVER}:${BACKEND_PATH}/app/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload models.py"
    exit 1
}
Write-Host "SUCCESS: models.py uploaded"
Write-Host ""

# Step 4: Copy and rename Excel files temporarily
Write-Host "Step 4: Preparing Excel files..."
Copy-Item "源商品成本.xlsx" "source_cost.xlsx" -Force
Copy-Item "去重单品列表.xlsx" "product_mapping.xlsx" -Force
Write-Host "SUCCESS: Files prepared"
Write-Host ""

# Step 5: Upload Excel files
Write-Host "Step 5: Uploading Excel files..."
scp "source_cost.xlsx" ${SERVER}:/home/ubuntu/SunpizzaApp/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload source cost file"
    exit 1
}
Write-Host "SUCCESS: Source cost file uploaded"

scp "product_mapping.xlsx" ${SERVER}:/home/ubuntu/SunpizzaApp/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload product mapping file"
    exit 1
}
Write-Host "SUCCESS: Product mapping file uploaded"

# Clean up temporary files
Remove-Item "source_cost.xlsx" -Force
Remove-Item "product_mapping.xlsx" -Force
Write-Host ""

# Step 6: Upload requirements.txt
Write-Host "Step 6: Uploading requirements.txt..."
scp backend/requirements.txt ${SERVER}:${BACKEND_PATH}/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload requirements.txt"
    exit 1
}
Write-Host "SUCCESS: requirements.txt uploaded"
Write-Host ""

# Step 7: Install new dependencies
Write-Host "Step 7: Installing pandas and openpyxl..."
ssh $SERVER "cd $BACKEND_PATH; source venv/bin/activate; pip install pandas openpyxl"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies"
    exit 1
}
Write-Host "SUCCESS: Dependencies installed"
Write-Host ""

# Step 8: Upload import script
Write-Host "Step 8: Uploading import script..."
scp backend/import_excel_data.py ${SERVER}:${BACKEND_PATH}/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload import script"
    exit 1
}
Write-Host "SUCCESS: Import script uploaded"
Write-Host ""

# Step 9: Run import script
Write-Host "Step 9: Running data import..."
ssh $SERVER "cd $BACKEND_PATH; source venv/bin/activate; python import_excel_data.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Data import failed"
    exit 1
}
Write-Host "SUCCESS: Data import completed"
Write-Host ""

# Step 10: Restart backend service
Write-Host "Step 10: Restarting backend service..."
ssh $SERVER "sudo systemctl restart sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restart service"
    exit 1
}
Write-Host "SUCCESS: Service restarted"
Write-Host ""

# Step 11: Check service status
Write-Host "Step 11: Checking service status..."
ssh $SERVER "sudo systemctl status sunpizza-backend --no-pager | head -15"
Write-Host ""

Write-Host "============================================"
Write-Host "Deployment and Import Complete!"
Write-Host "============================================"

