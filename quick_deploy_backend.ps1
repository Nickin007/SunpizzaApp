# ==========================================
# 快速部署后端 - 通用脚本
# ==========================================

param(
    [string]$File = ""
)

$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$BACKEND_DIR = "/home/ubuntu/SunpizzaApp/backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "快速部署后端服务" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 如果指定了文件，则上传文件
if ($File -ne "") {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Step 1: 上传指定文件" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "文件: $File" -ForegroundColor Gray
    
    # 获取文件在backend目录下的相对路径
    $relativePath = $File -replace "^backend[/\\]", ""
    $remoteDir = Split-Path -Parent $relativePath
    $remoteDir = $remoteDir -replace "\\", "/"
    
    Write-Host "上传到: ${BACKEND_DIR}/${remoteDir}" -ForegroundColor Gray
    
    # 确保远程目录存在
    ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${BACKEND_DIR}/${remoteDir}"
    
    # 上传文件
    scp $File ${SERVER_USER}@${SERVER_IP}:${BACKEND_DIR}/${relativePath}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 文件上传成功" -ForegroundColor Green
    } else {
        Write-Host "✗ 文件上传失败" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "⚠ 未指定文件，跳过上传步骤" -ForegroundColor Yellow
    Write-Host "  使用方法: .\quick_deploy_backend.ps1 -File backend/app/api/cost_analysis.py" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 2: 重启后端服务" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl restart sunpizza-backend"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 后端服务重启成功" -ForegroundColor Green
} else {
    Write-Host "✗ 后端服务重启失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 3: 检查服务状态" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

Start-Sleep -Seconds 2

ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl status sunpizza-backend --no-pager | head -15"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ 部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

