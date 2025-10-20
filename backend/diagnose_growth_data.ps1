# ============================================
#  Diagnose Growth Data Upload Issue
#  Server: 118.89.73.199
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Diagnose Growth Data Upload" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Observed Issue:" -ForegroundColor Yellow
Write-Host "  - Upload shows: Total 61, Success 0, Failed 61" -ForegroundColor Red
Write-Host "  - But data view shows 1 record with partial data:" -ForegroundColor Yellow
Write-Host "    * Basic info: OK (date, store_name, city, etc.)" -ForegroundColor Green
Write-Host "    * All indicators: Empty (0.00, -, 0%)" -ForegroundColor Red
Write-Host ""

Write-Host "Root Cause Analysis:" -ForegroundColor Yellow
Write-Host "  Likely: Excel column names don't match GROWTH_FIELD_MAPPING" -ForegroundColor White
Write-Host ""

Write-Host "[1/2] Checking backend logs for errors..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "sudo journalctl -u sunpizza-backend -n 100 | grep -E 'growth|插入数据失败|error' | tail -20"
Write-Host ""

Write-Host "[2/2] Checking database for actual data..." -ForegroundColor Yellow
ssh ubuntu@118.89.73.199 "mysql -u root -p'Qq20021120' sunpizza_db -e \"SELECT id, data_date, store_name, store_score, peak_hours_7d_current, business_hours_7d_current FROM eleme_growth_data ORDER BY id DESC LIMIT 1;\" 2>/dev/null"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Diagnosis Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Check your Excel file column names" -ForegroundColor Cyan
Write-Host "     Expected names (must match exactly):" -ForegroundColor White
Write-Host ""
Write-Host "     Basic Fields (Working):" -ForegroundColor Green
Write-Host "       - 日期" -ForegroundColor White
Write-Host "       - 门店名称" -ForegroundColor White
Write-Host "       - 门店id" -ForegroundColor White
Write-Host "       - 省份, 城市名称, 区县名称" -ForegroundColor White
Write-Host ""
Write-Host "     Indicator Fields (Not Working - Check These!):" -ForegroundColor Red
Write-Host "       - L等级分布" -ForegroundColor White
Write-Host "       - 店铺分" -ForegroundColor White
Write-Host "       - 近7日高峰营业时长当前值" -ForegroundColor White
Write-Host "       - 近7日高峰营业时长目标值" -ForegroundColor White
Write-Host "       - 近7日高峰营业时长指标得分" -ForegroundColor White
Write-Host "       - 近7日高峰营业时长指标权重" -ForegroundColor White
Write-Host "       - ... (and 47 more indicator fields)" -ForegroundColor White
Write-Host ""
Write-Host "  2. Common issues:" -ForegroundColor Yellow
Write-Host "     a) Column name has extra spaces" -ForegroundColor White
Write-Host "        Bad:  '近7日高峰营业时长当前值 ' (trailing space)" -ForegroundColor Red
Write-Host "        Good: '近7日高峰营业时长当前值'" -ForegroundColor Green
Write-Host ""
Write-Host "     b) Column name uses wrong characters" -ForegroundColor White
Write-Host "        Bad:  '近7日高峰营业时长当前值' (full-width digits)" -ForegroundColor Red
Write-Host "        Good: '近7日高峰营业时长当前值' (half-width digits)" -ForegroundColor Green
Write-Host ""
Write-Host "     c) Column name missing or renamed" -ForegroundColor White
Write-Host "        Bad:  '高峰营业时长当前值' (missing '近7日')" -ForegroundColor Red
Write-Host "        Good: '近7日高峰营业时长当前值'" -ForegroundColor Green
Write-Host ""
Write-Host "  3. Solution:" -ForegroundColor Yellow
Write-Host "     Option A: Fix Excel column names to match exactly" -ForegroundColor Cyan
Write-Host "     Option B: Provide Excel screenshot so I can create custom mapping" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Test again:" -ForegroundColor Yellow
Write-Host "     - Delete current failed record" -ForegroundColor White
Write-Host "     - Upload corrected Excel file" -ForegroundColor White
Write-Host "     - Check data view for non-zero values" -ForegroundColor White
Write-Host ""

