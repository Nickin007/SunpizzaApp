# Quick Redeploy Frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Redeploy Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$FRONTEND_SERVER = "ubuntu@118.25.70.79"
$FRONTEND_PATH = "~/SunpizzaApp/admin-web"

# Step 1: Build frontend
Write-Host "[Step 1/3] Building frontend..." -ForegroundColor Yellow
npm install
npm run build
Write-Host "Frontend build completed!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy frontend
Write-Host "[Step 2/3] Deploying frontend..." -ForegroundColor Yellow
Write-Host "Creating dist.zip..." -ForegroundColor Gray
if (Test-Path "dist.zip") {
    Remove-Item "dist.zip" -Force
}
Compress-Archive -Path "dist\*" -DestinationPath "dist.zip"

Write-Host "Uploading dist.zip to frontend server..." -ForegroundColor Gray
scp dist.zip ${FRONTEND_SERVER}:/tmp/

Write-Host "Deploying on frontend server..." -ForegroundColor Gray
ssh $FRONTEND_SERVER @"
    cd $FRONTEND_PATH
    sudo rm -rf dist/*
    sudo unzip -o /tmp/dist.zip -d dist/
    sudo chown -R ubuntu:ubuntu dist/
    sudo chmod -R 755 dist/
    sudo nginx -t && sudo systemctl reload nginx
    rm /tmp/dist.zip
"@

Write-Host "Frontend deployed successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Cleanup
Write-Host "[Step 3/3] Cleaning up..." -ForegroundColor Yellow
if (Test-Path "dist.zip") {
    Remove-Item "dist.zip" -Force
}
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Visit http://118.25.70.79:3000 and press Ctrl+Shift+R to refresh" -ForegroundColor Yellow
Write-Host ""

