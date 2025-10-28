Write-Host "============================================"
Write-Host "Deploy Mapping Status Feature"
Write-Host "============================================"
Write-Host ""

$SERVER = "ubuntu@118.89.73.199"
$BACKEND_PATH = "/home/ubuntu/SunpizzaApp/backend"

Write-Host "Step 1: Uploading backend API..."
scp backend/app/api/cost_analysis.py ${SERVER}:${BACKEND_PATH}/app/api/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload cost_analysis.py"
    exit 1
}
Write-Host "SUCCESS: Backend API uploaded"
Write-Host ""

Write-Host "Step 2: Restarting backend service..."
ssh $SERVER "sudo systemctl restart sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restart service"
    exit 1
}
Write-Host "SUCCESS: Service restarted"
Write-Host ""

Write-Host "Step 3: Checking service status..."
ssh $SERVER "sudo systemctl status sunpizza-backend --no-pager | head -15"
Write-Host ""

Write-Host "============================================"
Write-Host "Deployment Complete!"
Write-Host "============================================"

