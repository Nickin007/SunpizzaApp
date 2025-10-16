# Deploy Admin-Web User Delete Feature
# Updates user management page with enhanced delete confirmation

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Admin-Web User Delete Feature" -ForegroundColor Cyan
Write-Host "  Server: 118.25.70.79" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Changes:" -ForegroundColor Yellow
Write-Host "  - Enhanced delete confirmation dialog" -ForegroundColor Gray
Write-Host "  - Shows detailed warning about data deletion" -ForegroundColor Gray
Write-Host "  - Lists all data that will be removed" -ForegroundColor Gray
Write-Host ""

# Build admin-web
Write-Host "[1/3] Building admin-web..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build complete!" -ForegroundColor Green
Write-Host ""

# Upload dist folder
Write-Host "[2/3] Uploading to server..." -ForegroundColor Yellow
scp -r dist/* ubuntu@118.25.70.79:~/SunpizzaApp/admin-web/dist/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Upload complete!" -ForegroundColor Green
Write-Host ""

# Set permissions
Write-Host "[3/3] Setting permissions..." -ForegroundColor Yellow
ssh ubuntu@118.25.70.79 "chmod -R 755 ~/SunpizzaApp/admin-web/dist"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin-Web URL: http://118.25.70.79" -ForegroundColor Green
Write-Host ""
Write-Host "Test the new delete feature:" -ForegroundColor Yellow
Write-Host "  1. Login as admin" -ForegroundColor White
Write-Host "  2. Go to User Management" -ForegroundColor White
Write-Host "  3. Click delete button on any user" -ForegroundColor White
Write-Host "  4. Review the detailed warning dialog" -ForegroundColor White
Write-Host "  5. Confirm deletion" -ForegroundColor White
Write-Host ""

