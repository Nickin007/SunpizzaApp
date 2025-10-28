Write-Host "============================================"
Write-Host "Deploy Cost Mapping Feature"
Write-Host "============================================"
Write-Host ""

$SERVER = "ubuntu@118.89.73.199"
$BACKEND_PATH = "/home/ubuntu/SunpizzaApp/backend"

Write-Host "Step 1: Uploading migration script..."
scp backend/deploy/migrate_add_cost_mapping_tables.py ${SERVER}:${BACKEND_PATH}/deploy/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload migration script"
    exit 1
}
Write-Host "SUCCESS: Migration script uploaded"
Write-Host ""

Write-Host "Step 2: Running database migration..."
ssh $SERVER "cd $BACKEND_PATH; source venv/bin/activate; python deploy/migrate_add_cost_mapping_tables.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed"
    exit 1
}
Write-Host "SUCCESS: Migration completed"
Write-Host ""

Write-Host "Step 3: Uploading updated models.py..."
scp backend/app/models.py ${SERVER}:${BACKEND_PATH}/app/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload models.py"
    exit 1
}
Write-Host "SUCCESS: models.py uploaded"
Write-Host ""

Write-Host "Step 4: Uploading updated cost_analysis.py..."
scp backend/app/api/cost_analysis.py ${SERVER}:${BACKEND_PATH}/app/api/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload cost_analysis.py"
    exit 1
}
Write-Host "SUCCESS: cost_analysis.py uploaded"
Write-Host ""

Write-Host "Step 5: Restarting backend service..."
ssh $SERVER "sudo systemctl restart sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restart service"
    exit 1
}
Write-Host "SUCCESS: Service restarted"
Write-Host ""

Write-Host "Step 6: Checking service status..."
ssh $SERVER "sudo systemctl status sunpizza-backend --no-pager | head -15"
Write-Host ""

Write-Host "============================================"
Write-Host "Deployment Complete!"
Write-Host "============================================"

