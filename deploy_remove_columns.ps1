# Database Structure Modification Deployment Script
# Remove unnecessary columns:
# - source_cost_library: source_product_sku, category
# - product_mapping: source_product_sku

Write-Host "========================================"
Write-Host "Database Structure Modification Script"
Write-Host "========================================"
Write-Host ""

$SERVER = "ubuntu@118.89.73.199"
$BACKEND_PATH = "/home/ubuntu/SunpizzaApp/backend"

# Step 1: Upload migration script
Write-Host "Step 1: Uploading migration script..."
scp backend/deploy/migrate_remove_columns.py ${SERVER}:${BACKEND_PATH}/deploy/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload migration script"
    exit 1
}
Write-Host "SUCCESS: Migration script uploaded"
Write-Host ""

# Step 2: Run migration script
Write-Host "Step 2: Running database migration..."
$migrateCmd = "cd $BACKEND_PATH; source venv/bin/activate; python deploy/migrate_remove_columns.py"
ssh $SERVER $migrateCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database migration failed"
    exit 1
}
Write-Host "SUCCESS: Database migration completed"
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

# Step 4: Restart backend service
Write-Host "Step 4: Restarting backend service..."
ssh $SERVER "sudo systemctl restart sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restart service"
    exit 1
}
Write-Host "SUCCESS: Service restarted"
Write-Host ""

# Step 5: Check service status
Write-Host "Step 5: Checking service status..."
ssh $SERVER "sudo systemctl status sunpizza-backend --no-pager | head -15"
Write-Host ""

Write-Host "========================================"
Write-Host "Deployment Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Removed columns:"
Write-Host "  SourceCostLibrary:"
Write-Host "    - source_product_sku"
Write-Host "    - category"
Write-Host ""
Write-Host "  ProductMapping:"
Write-Host "    - source_product_sku"
Write-Host ""
