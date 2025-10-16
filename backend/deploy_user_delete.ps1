# Deploy User Delete Feature
# Adds cascade deletion for users and all related data

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy User Delete Feature" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Changes:" -ForegroundColor Yellow
Write-Host "  - Users can now be deleted regardless of login status" -ForegroundColor Gray
Write-Host "  - Cascade deletion of all related data:" -ForegroundColor Gray
Write-Host "    * Work orders created by user" -ForegroundColor Gray
Write-Host "    * Work orders assigned to user" -ForegroundColor Gray
Write-Host "    * Comments by user" -ForegroundColor Gray
Write-Host "    * Activity logs" -ForegroundColor Gray
Write-Host "    * Attachments uploaded by user" -ForegroundColor Gray
Write-Host ""

# Upload updated users.py
Write-Host "[1/2] Uploading updated users.py..." -ForegroundColor Yellow
scp app/api/users.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Upload complete!" -ForegroundColor Green
Write-Host ""

# Restart backend service
Write-Host "[2/2] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

Start-Sleep -Seconds 3

# Check service status
Write-Host "Checking service status..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager | head -10"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Backend Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Safety Features:" -ForegroundColor Green
Write-Host "  - Cannot delete currently logged-in user" -ForegroundColor White
Write-Host "  - Shows deletion statistics after operation" -ForegroundColor White
Write-Host ""
Write-Host "Next: Deploy frontend changes to admin-web" -ForegroundColor Yellow
Write-Host ""

