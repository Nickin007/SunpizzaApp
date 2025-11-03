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
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Please fix TypeScript errors first." -ForegroundColor Red
    exit 1
}
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
$deployScript = @'
cd ~/SunpizzaApp/admin-web
echo '清理旧文件...'
sudo rm -rf dist/*
echo '解压新文件...'
sudo mkdir -p dist
cd dist
sudo unzip -o /tmp/dist.zip
cd ..
echo '设置文件权限（www-data用户，nginx可访问）...'
sudo chown -R www-data:www-data dist/
sudo chmod -R 755 dist/
echo '验证nginx配置并重载...'
sudo nginx -t && sudo systemctl reload nginx
echo '清理临时文件...'
rm -f /tmp/dist.zip
echo '[OK] 部署完成！'
'@
# 移除 Windows 换行符（CRLF -> LF），避免在 Linux 上出现问题
($deployScript -replace "`r`n", "`n") | ssh $FRONTEND_SERVER bash

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
Write-Host "🔍 运行诊断检查..." -ForegroundColor Yellow
$diagnoseScript = @'
echo '=== 1. 检查文件结构 ==='
ls -lah ~/SunpizzaApp/admin-web/dist/ 2>/dev/null || echo 'dist 目录不存在'
echo ''

echo '=== 2. 检查 assets 目录 ==='
if [ -d ~/SunpizzaApp/admin-web/dist/assets ]; then
    echo 'assets 目录文件数量:'
    ls -1 ~/SunpizzaApp/admin-web/dist/assets 2>/dev/null | wc -l
    echo 'assets 目录内容:'
    ls -lh ~/SunpizzaApp/admin-web/dist/assets 2>/dev/null | head -10
else
    echo '[FAIL] assets 目录不存在！'
fi
echo ''

echo '=== 3. 检查 index.html 内容 ==='
head -20 ~/SunpizzaApp/admin-web/dist/index.html 2>/dev/null || echo 'index.html 不存在'
echo ''

echo '=== 4. 检查 Nginx 配置 ==='
echo '当前启用的站点:'
sudo ls -la /etc/nginx/sites-enabled/ 2>/dev/null
echo ''
echo 'Nginx root 路径配置:'
sudo grep -E '^\s*root' /etc/nginx/sites-enabled/* 2>/dev/null || echo '未找到 root 配置'
echo ''

echo '=== 5. 测试文件访问权限 ==='
sudo -u www-data test -r ~/SunpizzaApp/admin-web/dist/index.html && echo '[OK] www-data 可以读取 index.html' || echo '[FAIL] www-data 无法读取 index.html'
echo ''

echo '=== 6. 测试 HTTP 访问 ==='
echo '测试 index.html:'
curl -I http://localhost/ 2>/dev/null | head -3
echo ''
echo '获取实际的 JS 文件路径:'
JS_FILE=$(grep -oE 'src="/assets/[^"]+\.js"' ~/SunpizzaApp/admin-web/dist/index.html 2>/dev/null | head -1 | sed 's/src="//;s/"//')
if [ -n "$JS_FILE" ]; then
    echo "找到 JS 文件路径: $JS_FILE"
    echo '测试 JS 文件访问:'
    curl -I http://localhost$JS_FILE 2>/dev/null | head -3 || echo 'JS 文件无法访问'
else
    echo '无法从 index.html 中提取 JS 文件路径'
    echo '列出 assets 目录中的 JS 文件:'
    ls -1 ~/SunpizzaApp/admin-web/dist/assets/*.js 2>/dev/null | head -3 || echo '未找到 JS 文件'
fi
echo ''

echo '=== 7. 检查 Nginx 错误日志（最近10条，排除扫描器IP）==='
echo '最近10条错误日志（排除扫描器）:'
sudo tail -30 /var/log/nginx/sunpizza-admin-error.log 2>/dev/null | grep -v "195.178.110.109\|64.62.197.121" | tail -10 || echo '无相关错误日志'
echo ''
echo '检查是否还有 index.html 或 assets 相关的错误（最近5分钟）:'
CURRENT_TIME=$(date +%s)
FIVE_MIN_AGO=$((CURRENT_TIME - 300))
sudo grep "$(date -d @$FIVE_MIN_AGO '+%Y/%m/%d %H:%M')" /var/log/nginx/sunpizza-admin-error.log 2>/dev/null | grep -E "index\.html|assets" | tail -5 || echo '最近5分钟内无相关错误'
echo ''

echo '=== 8. 检查访问日志（最近的访问）==='
sudo tail -5 /var/log/nginx/sunpizza-admin-access.log 2>/dev/null || echo '无访问日志'
'@
# 移除 Windows 换行符（CRLF -> LF），避免在 Linux 上出现问题
($diagnoseScript -replace "`r`n", "`n") | ssh $FRONTEND_SERVER bash
Write-Host ""
Write-Host "🌐 访问地址: http://118.25.70.79" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 如果页面不显示的排查步骤:" -ForegroundColor Yellow
Write-Host "  1. 打开浏览器控制台 (F12)" -ForegroundColor White
Write-Host "  2. 查看 Console 标签是否有错误" -ForegroundColor White
Write-Host "  3. 查看 Network 标签，检查资源是否加载成功" -ForegroundColor White
Write-Host "  4. 尝试无痕模式访问" -ForegroundColor White
Write-Host "  5. 清除浏览器缓存后强制刷新 (Ctrl+Shift+R)" -ForegroundColor White
Write-Host ""
Write-Host "💡 如果服务器端测试正常但浏览器不显示，通常是:" -ForegroundColor Cyan
Write-Host "  - 浏览器缓存了旧版本" -ForegroundColor White
Write-Host "  - JavaScript 执行错误（查看控制台）" -ForegroundColor White
Write-Host "  - 后端 API 连接问题（检查网络请求）" -ForegroundColor White
Write-Host ""

