# Deploy Privacy Policy to Backend Server
# Server: 118.89.73.199

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploy Privacy Policy" -ForegroundColor Cyan
Write-Host "  Server: 118.89.73.199" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create static directory
Write-Host "[1/5] Creating static directory..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "mkdir -p ~/SunpizzaApp/backend/static"

# Step 2: Upload privacy.html
Write-Host "[2/5] Uploading privacy.html..." -ForegroundColor Yellow
scp static/privacy.html ubuntu@118.89.73.199:~/SunpizzaApp/backend/static/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Upload wsgi.py
Write-Host "[3/5] Uploading wsgi.py..." -ForegroundColor Yellow
scp wsgi.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Restart backend service
Write-Host "[4/5] Restarting backend service..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"

Start-Sleep -Seconds 2

# Step 5: Check service status
Write-Host "[5/5] Checking service status..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager | head -10"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Privacy Policy URL:" -ForegroundColor Cyan
Write-Host "http://118.89.73.199:5000/privacy" -ForegroundColor White
Write-Host ""
Write-Host "Please verify in your browser." -ForegroundColor Yellow
Write-Host ""

