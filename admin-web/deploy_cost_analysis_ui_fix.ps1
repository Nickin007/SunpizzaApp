# 成本分析UI修复 - 前端部署脚本
# 1. 添加页面标题和描述
# 2. 统一订单整合子tab样式
# 3. 修复日历显示问题

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "成本分析UI修复 - 前端部署" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# 配置
$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$REMOTE_WEB_PATH = "/var/www/sunpizza-admin"
$LOCAL_WEB_DIR = "dist"

# 步骤1: 构建前端
Write-Host "📦 步骤1: 构建前端项目..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 前端构建成功！`n" -ForegroundColor Green

# 步骤2: 备份远程文件
Write-Host "💾 步骤2: 备份远程前端文件..." -ForegroundColor Yellow
$backupName = "sunpizza-admin_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
ssh ${SERVER_USER}@${SERVER_IP} "sudo cp -r $REMOTE_WEB_PATH /tmp/${backupName} 2>/dev/null || true"
Write-Host "✅ 远程文件备份完成！`n" -ForegroundColor Green

# 步骤3: 上传前端文件
Write-Host "📤 步骤3: 上传前端文件到服务器..." -ForegroundColor Yellow
ssh ${SERVER_USER}@${SERVER_IP} "rm -rf /tmp/sunpizza-web-new && mkdir -p /tmp/sunpizza-web-new"
scp -r ${LOCAL_WEB_DIR}/* ${SERVER_USER}@${SERVER_IP}:/tmp/sunpizza-web-new/
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 文件上传失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 文件上传完成！`n" -ForegroundColor Green

# 步骤4: 部署文件
Write-Host "🚀 步骤4: 部署文件到目标目录..." -ForegroundColor Yellow
ssh ${SERVER_USER}@${SERVER_IP} "sudo rm -rf $REMOTE_WEB_PATH/* && sudo mv /tmp/sunpizza-web-new/* $REMOTE_WEB_PATH/ && sudo chown -R www-data:www-data $REMOTE_WEB_PATH && sudo chmod -R 755 $REMOTE_WEB_PATH"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 文件部署失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 文件部署完成！`n" -ForegroundColor Green

# 步骤5: 重启Nginx
Write-Host "🔄 步骤5: 重启Nginx..." -ForegroundColor Yellow
ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl reload nginx"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Nginx重启失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Nginx重启成功！`n" -ForegroundColor Green

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ 成本分析UI修复部署完成！" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "📝 修复内容：" -ForegroundColor Cyan
Write-Host "  1. ✅ 添加页面标题：饿了么 - 成本分析（蓝色标题）" -ForegroundColor White
Write-Host "  2. ✅ 添加页面描述：成本数据管理、商品映射与成本分析配置" -ForegroundColor White
Write-Host "  3. ✅ 统一订单整合子tab样式（移除card类型，与数据查看保持一致）" -ForegroundColor White
Write-Host "  4. ✅ 日历显示所有5个任务字段" -ForegroundColor White
Write-Host "  5. ✅ 日历完成度显示为 x/5" -ForegroundColor White
Write-Host "  6. ✅ 只统计定义的5种数据类型`n" -ForegroundColor White

Write-Host "🌐 访问地址: http://${SERVER_IP}" -ForegroundColor Cyan
Write-Host "📍 导航到: 配送管理 > 饿了么 > 成本分析`n" -ForegroundColor Cyan

Write-Host "⚠️  注意: 部署后请按 Ctrl+F5 强制刷新浏览器缓存！" -ForegroundColor Yellow

