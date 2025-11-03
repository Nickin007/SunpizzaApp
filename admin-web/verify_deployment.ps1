# 快速验证部署状态
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  验证前端部署状态" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$FRONTEND_SERVER = "ubuntu@118.25.70.79"
$FRONTEND_PATH = "~/SunpizzaApp/admin-web"

ssh $FRONTEND_SERVER @"
    echo '=== 1. 检查部署文件 ==='
    echo '文件列表:'
    ls -lah $FRONTEND_PATH/dist/ 2>/dev/null || echo 'dist 目录不存在！'
    echo ''
    
    echo '=== 2. 检查 index.html ==='
    if [ -f $FRONTEND_PATH/dist/index.html ]; then
        echo '✅ index.html 存在'
        echo '文件大小:'
        ls -lh $FRONTEND_PATH/dist/index.html
        echo '文件权限:'
        ls -l $FRONTEND_PATH/dist/index.html
    else
        echo '❌ index.html 不存在！'
    fi
    echo ''
    
    echo '=== 3. 检查 assets 目录 ==='
    if [ -d $FRONTEND_PATH/dist/assets ]; then
        echo '✅ assets 目录存在'
        echo '文件数量:'
        ls -1 $FRONTEND_PATH/dist/assets | wc -l
        echo '示例文件:'
        ls -lh $FRONTEND_PATH/dist/assets | head -5
    else
        echo '❌ assets 目录不存在！'
    fi
    echo ''
    
    echo '=== 4. 检查文件权限 ==='
    ls -ld $FRONTEND_PATH/dist
    echo ''
    
    echo '=== 5. 检查 Nginx 配置 ==='
    echo '配置文件路径:'
    sudo ls -la /etc/nginx/sites-enabled/ | grep -E 'sunpizza|default'
    echo ''
    echo 'Nginx root 配置:'
    sudo grep -E 'root|server_name' /etc/nginx/sites-enabled/sunpizza-admin 2>/dev/null || \
    sudo grep -E 'root|server_name' /etc/nginx/sites-enabled/default 2>/dev/null || \
    echo '未找到配置'
    echo ''
    
    echo '=== 6. 检查 Nginx 服务状态 ==='
    sudo systemctl is-active nginx && echo '✅ Nginx 运行中' || echo '❌ Nginx 未运行'
    echo ''
    
    echo '=== 7. 测试文件访问 ==='
    echo '尝试读取 index.html:'
    sudo -u www-data test -r $FRONTEND_PATH/dist/index.html && echo '✅ www-data 可以读取' || echo '❌ www-data 无法读取'
    echo ''
    
    echo '=== 8. 检查最近的 Nginx 错误 ==='
    echo '最近5条错误:'
    sudo tail -5 /var/log/nginx/sunpizza-admin-error.log 2>/dev/null || sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo '无错误日志'
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  验证完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

