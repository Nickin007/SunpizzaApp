#!/usr/bin/env pwsh
# Quick fix script for missing import

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Fix: Adding Missing Imports" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SERVER_IP = "118.89.73.199"

Write-Host "[1/2] Uploading fixed eleme.py..." -ForegroundColor Green
scp -o StrictHostKeyChecking=no app/api/eleme.py ubuntu@${SERVER_IP}:/home/ubuntu/SunpizzaApp/backend/app/api/

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Done: File uploaded" -ForegroundColor Green
} else {
    Write-Host "  Error: Upload failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/2] Restarting backend service..." -ForegroundColor Green
ssh -o StrictHostKeyChecking=no ubuntu@${SERVER_IP} "sudo systemctl restart sunpizza-backend"
Start-Sleep -Seconds 2

Write-Host "  Done: Service restarted" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Applied Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Fixed Import:" -ForegroundColor Yellow
Write-Host "  + ElemeActiveStore" -ForegroundColor White
Write-Host "  + ElemeOrderShihengData" -ForegroundColor White
Write-Host ""
Write-Host "Please refresh your browser and try again." -ForegroundColor Gray
Write-Host ""

