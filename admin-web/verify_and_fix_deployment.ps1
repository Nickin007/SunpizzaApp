# ============================================
#  Verify and Fix Frontend Deployment
#  Server: 118.25.70.79
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Verify & Fix Frontend Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Checking current deployment..." -ForegroundColor Yellow
ssh ubuntu@118.25.70.79 @"
    echo '📂 检查 /var/www/html 目录:'
    ls -lh /var/www/html/ | head -10
    echo ''
    echo '📅 最近修改时间:'
    stat /var/www/html/index.html 2>/dev/null | grep Modify || echo '  index.html 不存在！'
    echo ''
    echo '👤 文件权限和所有者:'
    ls -la /var/www/html/index.html 2>/dev/null || echo '  index.html 不存在！'
"@
Write-Host ""

Write-Host "[2/5] Checking if dist.zip exists locally..." -ForegroundColor Yellow
if (Test-Path "dist.zip") {
    Write-Host "  ✅ dist.zip found" -ForegroundColor Green
    $uploadNew = $true
} else {
    Write-Host "  ❌ dist.zip not found" -ForegroundColor Red
    Write-Host "  需要先运行: npm run build && Compress-Archive -Path dist\* -DestinationPath dist.zip -Force" -ForegroundColor Yellow
    $uploadNew = $false
}
Write-Host ""

if ($uploadNew) {
    Write-Host "[3/5] Re-uploading dist.zip..." -ForegroundColor Yellow
    scp dist.zip ubuntu@118.25.70.79:~/
    Write-Host "  Upload completed!" -ForegroundColor Green
    Write-Host ""

    Write-Host "[4/5] Force re-deploying..." -ForegroundColor Yellow
    ssh ubuntu@118.25.70.79 @"
        echo '🗑️  删除旧文件...'
        sudo rm -rf /var/www/html/*
        
        echo '📦 解压新文件...'
        rm -rf ~/dist_temp
        unzip -q ~/dist.zip -d ~/dist_temp
        
        echo '📋 复制到 /var/www/html...'
        sudo cp -r ~/dist_temp/* /var/www/html/
        
        echo '🔐 设置权限...'
        sudo chown -R www-data:www-data /var/www/html
        sudo chmod -R 755 /var/www/html
        
        echo '🧹 清理临时文件...'
        rm -rf ~/dist_temp
        
        echo ''
        echo '✅ 重新部署完成！'
        echo ''
        echo '新文件列表:'
        ls -lh /var/www/html/ | head -10
"@
    Write-Host ""
} else {
    Write-Host "[3/5] Skipped - no dist.zip" -ForegroundColor Yellow
    Write-Host "[4/5] Skipped - no dist.zip" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "[5/5] Clearing nginx cache and restarting..." -ForegroundColor Yellow
ssh ubuntu@118.25.70.79 @"
    echo '清除 nginx 缓存...'
    sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || echo '  nginx 重载失败（可能不需要）'
    echo '✅ 完成'
"@
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Verification & Fix Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "🔄 Now do these steps:" -ForegroundColor Yellow
Write-Host "  1. 在浏览器中访问: http://118.25.70.79" -ForegroundColor Cyan
Write-Host "  2. 按 Ctrl + Shift + R (强制刷新，清除浏览器缓存)" -ForegroundColor Cyan
Write-Host "  3. 或者按 Ctrl + F5" -ForegroundColor Cyan
Write-Host "  4. 或者打开浏览器开发者工具，右键刷新按钮 → 清空缓存并硬性重新加载" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Check List:" -ForegroundColor Yellow
Write-Host "  ✓ 登录系统" -ForegroundColor White
Write-Host "  ✓ 进入: 外卖数据分析 → 饿了么分析" -ForegroundColor White
Write-Host "  ✓ 数据上传: 查看是否有'粉丝群数据'选项" -ForegroundColor White
Write-Host "  ✓ 数据查看: 查看是否有'👥 粉丝群数据'标签" -ForegroundColor White
Write-Host ""

Write-Host "If still not updated:" -ForegroundColor Red
Write-Host "  1. Clear all browser cache" -ForegroundColor White
Write-Host "  2. Use incognito/private mode" -ForegroundColor White
Write-Host "  3. Try a different browser" -ForegroundColor White
Write-Host ""

