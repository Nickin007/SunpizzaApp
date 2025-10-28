Write-Host "============================================"
Write-Host "Deploy Cost Mapping Algorithm Update"
Write-Host "============================================"
Write-Host ""

$SERVER = "ubuntu@118.89.73.199"
$BACKEND_PATH = "/home/ubuntu/SunpizzaApp/backend"

Write-Host "Step 1: Uploading updated cost_analysis.py..."
scp backend/app/api/cost_analysis.py ${SERVER}:${BACKEND_PATH}/app/api/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload cost_analysis.py"
    exit 1
}
Write-Host "SUCCESS: cost_analysis.py uploaded"
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
Write-Host ""
Write-Host "Cost Mapping Algorithm Updated:"
Write-Host "- Parse product format: product_name_quantity"
Write-Host "- Extract product name and quantity using regex"
Write-Host "- Look up source product in mapping database"
Write-Host "- Look up cost in source cost library"
Write-Host "- Calculate: item_cost = unit_cost × quantity"
Write-Host "- Sum all item costs to get order total cost"

