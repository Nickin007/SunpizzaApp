# SSH Key Setup Script - For Password-Free Deployment
# This script helps you setup SSH key authentication

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SSH Key Setup for Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SERVER_IP_BACKEND = "118.89.73.199"
$SERVER_IP_FRONTEND = "118.25.70.79"
$SERVER_USER = "ubuntu"

# Check if SSH key exists
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"

if (-not (Test-Path $sshKeyPath)) {
    Write-Host "No SSH key found. Generating new SSH key..." -ForegroundColor Yellow
    Write-Host ""
    
    # Generate SSH key
    ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N '""'
    
    Write-Host ""
    Write-Host "SSH key generated successfully!" -ForegroundColor Green
} else {
    Write-Host "SSH key already exists: $sshKeyPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Now copying SSH key to servers..." -ForegroundColor Yellow
Write-Host ""

# Copy to backend server
Write-Host "Copying to backend server ($SERVER_IP_BACKEND)..." -ForegroundColor Cyan
Write-Host "Please enter password: YYyy1q2w3e" -ForegroundColor Gray
type "$env:USERPROFILE\.ssh\id_rsa.pub" | ssh "${SERVER_USER}@${SERVER_IP_BACKEND}" "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backend server setup complete!" -ForegroundColor Green
} else {
    Write-Host "Backend server setup failed" -ForegroundColor Red
}

Write-Host ""

# Copy to frontend server
Write-Host "Copying to frontend server ($SERVER_IP_FRONTEND)..." -ForegroundColor Cyan
Write-Host "Please enter password: YYyy1q2w3e" -ForegroundColor Gray
type "$env:USERPROFILE\.ssh\id_rsa.pub" | ssh "${SERVER_USER}@${SERVER_IP_FRONTEND}" "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend server setup complete!" -ForegroundColor Green
} else {
    Write-Host "Frontend server setup failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   SSH Key Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "From now on, you won't need to enter passwords!" -ForegroundColor Cyan
Write-Host ""

