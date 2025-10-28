# 订单整合功能完整部署脚本
# 包含：日期选择、数据检查、订单整合、日期过滤等功能

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "订单整合功能完整部署" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# 配置
$SERVER_IP = "118.89.73.199"
$SERVER_USER = "ubuntu"
$REMOTE_WEB_PATH = "/var/www/sunpizza-admin"

# 步骤1: 构建前端
Write-Host "📦 步骤1: 构建前端项目..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 前端构建成功！`n" -ForegroundColor Green

# 步骤2: 上传文件
Write-Host "📤 步骤2: 上传前端文件..." -ForegroundColor Yellow
ssh ${SERVER_USER}@${SERVER_IP} "rm -rf /tmp/sunpizza-web-new && mkdir -p /tmp/sunpizza-web-new"
scp -r dist/* ${SERVER_USER}@${SERVER_IP}:/tmp/sunpizza-web-new/
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 文件上传失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 文件上传完成！`n" -ForegroundColor Green

# 步骤3: 部署
Write-Host "🚀 步骤3: 部署文件..." -ForegroundColor Yellow
ssh ${SERVER_USER}@${SERVER_IP} "sudo rm -rf $REMOTE_WEB_PATH/* && sudo mv /tmp/sunpizza-web-new/* $REMOTE_WEB_PATH/ && sudo chown -R www-data:www-data $REMOTE_WEB_PATH && sudo chmod -R 755 $REMOTE_WEB_PATH"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 文件部署失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 文件部署完成！`n" -ForegroundColor Green

# 步骤4: 重启Nginx
Write-Host "🔄 步骤4: 重启Nginx..." -ForegroundColor Yellow
ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl reload nginx"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Nginx重启失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Nginx重启成功！`n" -ForegroundColor Green

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ 订单整合功能部署完成！" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "📝 新功能：" -ForegroundColor Cyan
Write-Host "  1. ✅ 添加页面标题和描述" -ForegroundColor White
Write-Host "  2. ✅ 统一子tab样式（移除灰色背景）" -ForegroundColor White
Write-Host "  3. ✅ 删除整合日历子tab" -ForegroundColor White
Write-Host "  4. ✅ 订单整合控制模块（日期选择 + 数据检查）" -ForegroundColor White
Write-Host "  5. ✅ 数据完整性检查（绿勾/红叉显示）" -ForegroundColor White
Write-Host "  6. ✅ 按日期执行订单整合" -ForegroundColor White
Write-Host "  7. ✅ 未匹配订单日期过滤`n" -ForegroundColor White

Write-Host "🌐 访问地址: http://${SERVER_IP}" -ForegroundColor Cyan
Write-Host "📍 导航到: 配送管理 > 饿了么 > 成本分析 > 订单整合`n" -ForegroundColor Cyan

Write-Host "💡 使用说明：" -ForegroundColor Yellow
Write-Host "  1. 在订单整合数据库tab，选择要整合的日期" -ForegroundColor White
Write-Host "  2. 系统会自动检查该日期的数据是否齐全" -ForegroundColor White
Write-Host "  3. 数据齐全后点击'开始订单整合'按钮" -ForegroundColor White
Write-Host "  4. 在未匹配订单tab可以按日期范围筛选`n" -ForegroundColor White


