#!/bin/bash

# 快速诊断脚本 - 在服务器上运行

echo "========================================"
echo "  前端部署诊断脚本"
echo "========================================"
echo ""

FRONTEND_PATH="$HOME/SunpizzaApp/admin-web/dist"

echo "=== 1. 检查文件结构 ==="
echo "dist 目录内容:"
ls -lah $FRONTEND_PATH/ 2>/dev/null || echo "❌ dist 目录不存在！"
echo ""

echo "=== 2. 检查 assets 目录 ==="
if [ -d "$FRONTEND_PATH/assets" ]; then
    file_count=$(ls -1 "$FRONTEND_PATH/assets" 2>/dev/null | wc -l)
    echo "✅ assets 目录存在，包含 $file_count 个文件"
    echo "文件列表:"
    ls -lh "$FRONTEND_PATH/assets" | head -10
else
    echo "❌ assets 目录不存在！"
fi
echo ""

echo "=== 3. 检查 index.html ==="
if [ -f "$FRONTEND_PATH/index.html" ]; then
    echo "✅ index.html 存在"
    echo "文件权限:"
    ls -l "$FRONTEND_PATH/index.html"
    echo ""
    echo "index.html 前20行（检查资源引用）:"
    head -20 "$FRONTEND_PATH/index.html"
else
    echo "❌ index.html 不存在！"
fi
echo ""

echo "=== 4. 检查文件权限 ==="
echo "dist 目录权限:"
ls -ld "$FRONTEND_PATH"
echo ""
echo "测试 www-data 用户访问:"
sudo -u www-data test -r "$FRONTEND_PATH/index.html" && echo "✅ www-data 可以读取 index.html" || echo "❌ www-data 无法读取 index.html"
echo ""

echo "=== 5. 检查 Nginx 配置 ==="
echo "启用的站点:"
sudo ls -la /etc/nginx/sites-enabled/
echo ""
echo "查找 root 配置:"
sudo grep -r "root" /etc/nginx/sites-enabled/ | grep -v "#" | head -5
echo ""
echo "完整配置内容:"
sudo cat /etc/nginx/sites-enabled/sunpizza-admin 2>/dev/null || sudo cat /etc/nginx/sites-enabled/default 2>/dev/null || echo "未找到配置文件"
echo ""

echo "=== 6. 检查 Nginx 服务状态 ==="
sudo systemctl status nginx --no-pager | head -10
echo ""

echo "=== 7. 测试 Nginx 配置 ==="
sudo nginx -t
echo ""

echo "=== 8. 检查最近错误日志 ==="
echo "最近的错误（最后10条）:"
sudo tail -10 /var/log/nginx/sunpizza-admin-error.log 2>/dev/null || sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "无错误日志"
echo ""

echo "=== 9. 测试本地文件访问 ==="
echo "直接读取 index.html:"
head -5 "$FRONTEND_PATH/index.html" 2>/dev/null && echo "✅ 可以读取" || echo "❌ 无法读取"
echo ""

echo "========================================"
echo "  诊断完成"
echo "========================================"
echo ""
echo "如果发现问题，请检查："
echo "1. assets 目录是否有 JS/CSS 文件"
echo "2. Nginx root 配置是否指向正确路径"
echo "3. 文件权限是否为 www-data:www-data"
echo "4. Nginx 服务是否正常运行"
echo ""

