# ============================================
#  Fix Growth Data Type Parsing Issue
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  修复商家成长数据类型解析问题" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "问题描述:" -ForegroundColor Yellow
Write-Host "  - Growth数据上传后，指标字段全是空值/0" -ForegroundColor Red
Write-Host "  - 原因：_current, _target, _weight 字段未被识别为数值类型" -ForegroundColor Red
Write-Host ""

Write-Host "修复内容:" -ForegroundColor Yellow
Write-Host "  - 添加 _current, _target, _weight 字段的decimal解析" -ForegroundColor Green
Write-Host "  - 添加 store_score 字段的decimal解析" -ForegroundColor Green
Write-Host ""

Write-Host "[1/3] 上传修复后的 excel_parser.py..." -ForegroundColor Yellow
scp app/services/excel_parser.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/services/
if ($LASTEXITCODE -ne 0) {
    Write-Host "  上传失败!" -ForegroundColor Red
    exit 1
}
Write-Host "  上传成功!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] 重启后端服务..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  重启失败!" -ForegroundColor Red
    exit 1
}
Write-Host "  重启成功!" -ForegroundColor Green
Write-Host ""

Write-Host "等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

Write-Host "[3/3] 验证服务状态..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager | head -20"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  修复完成" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "测试步骤:" -ForegroundColor Yellow
Write-Host "  1. 删除之前失败的导入记录" -ForegroundColor White
Write-Host "  2. 重新上传Excel文件" -ForegroundColor White
Write-Host "  3. 检查导入历史：" -ForegroundColor White
Write-Host "     - 成功行数 应该 > 0" -ForegroundColor Green
Write-Host "     - 失败行数 应该 = 0" -ForegroundColor Green
Write-Host "  4. 打开数据查看，检查指标字段：" -ForegroundColor White
Write-Host "     - 店铺分 应该有实际数值（不是0.00）" -ForegroundColor Green
Write-Host "     - 各指标的当前值/目标值/得分/权重 应该有实际数值" -ForegroundColor Green
Write-Host ""

Write-Host "预期结果示例:" -ForegroundColor Yellow
Write-Host "  店铺分: 85.5 (而不是 0.00)" -ForegroundColor Green
Write-Host "  高峰营业时长当前值: 12.5 (而不是 -)" -ForegroundColor Green
Write-Host "  高峰营业时长目标值: 14.0 (而不是 -)" -ForegroundColor Green
Write-Host "  高峰营业时长得分: 89.3 (而不是 -)" -ForegroundColor Green
Write-Host "  高峰营业时长权重: 0.15 (而不是 -)" -ForegroundColor Green
Write-Host ""

