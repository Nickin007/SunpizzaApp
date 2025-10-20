# ============================================
#  Deploy Frontend (Static Files)
#  Server: 118.25.70.79 (前端服务器)
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Frontend Deployment - 粉丝群数据功能" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Server Info:" -ForegroundColor Yellow
Write-Host "  前端服务器: 118.25.70.79" -ForegroundColor White
Write-Host "  后端服务器: 118.89.73.199" -ForegroundColor White
Write-Host ""

Write-Host "Updated Files:" -ForegroundColor Yellow
Write-Host "  1. src/api/eleme.ts - 添加 getFansData API" -ForegroundColor White
Write-Host "  2. DataViewTab.tsx - 添加粉丝群数据查看（37字段）" -ForegroundColor White
Write-Host ""

Write-Host "[1/5] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Build completed!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/5] Compressing build files..." -ForegroundColor Yellow
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
Write-Host "  Compression completed!" -ForegroundColor Green
Write-Host ""

Write-Host "[3/5] Uploading to server (118.25.70.79)..." -ForegroundColor Yellow
scp dist.zip ubuntu@118.25.70.79:~/
Write-Host "  Upload completed!" -ForegroundColor Green
Write-Host ""

Write-Host "[4/5] Deploying on server..." -ForegroundColor Yellow
ssh ubuntu@118.25.70.79 @"
    echo '正在解压文件...'
    rm -rf ~/dist_temp
    unzip -q ~/dist.zip -d ~/dist_temp
    
    echo '备份旧文件...'
    sudo cp -r /var/www/html /var/www/html.backup.`$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    echo '部署新文件...'
    sudo rm -rf /var/www/html/*
    sudo cp -r ~/dist_temp/* /var/www/html/
    
    echo '设置权限（避免权限问题）...'
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 755 /var/www/html
    
    echo '清理临时文件...'
    rm -rf ~/dist_temp
    rm ~/dist.zip
    
    echo '✅ 部署完成！'
"@
Write-Host ""

Write-Host "[5/5] Verifying deployment..." -ForegroundColor Yellow
$htmlExists = ssh ubuntu@118.25.70.79 "test -f /var/www/html/index.html && echo 'yes' || echo 'no'"
if ($htmlExists -eq "yes") {
    Write-Host "  Verification passed!" -ForegroundColor Green
} else {
    Write-Host "  Warning: index.html not found!" -ForegroundColor Red
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Frontend Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Completed:" -ForegroundColor Green
Write-Host "  1. 构建完成" -ForegroundColor White
Write-Host "  2. 上传到前端服务器 (118.25.70.79)" -ForegroundColor White
Write-Host "  3. 解压并部署到 /var/www/html" -ForegroundColor White
Write-Host "  4. 设置正确的权限 (www-data:www-data, 755)" -ForegroundColor White
Write-Host "  5. 清理临时文件" -ForegroundColor White
Write-Host ""

Write-Host "🌐 Access your site:" -ForegroundColor Yellow
Write-Host "  http://118.25.70.79" -ForegroundColor Cyan
Write-Host ""

Write-Host "🧪 Test Fans Data Feature:" -ForegroundColor Yellow
Write-Host "  1. 登录系统" -ForegroundColor White
Write-Host "  2. 进入: 外卖数据分析 → 饿了么分析" -ForegroundColor White
Write-Host "  3. 数据上传: 选择'粉丝群数据'上传Excel" -ForegroundColor White
Write-Host "  4. 数据查看: 点击'👥 粉丝群数据'查看37个字段" -ForegroundColor White
Write-Host ""

Write-Host "📝 Notes:" -ForegroundColor Yellow
Write-Host "  - 旧文件已备份到 /var/www/html.backup.yyyymmdd_HHMMSS" -ForegroundColor White
Write-Host "  - 权限已设置为 www-data:www-data，避免403错误" -ForegroundColor White
Write-Host "  - 如有缓存问题，请Ctrl+Shift+R强制刷新" -ForegroundColor White
Write-Host ""

