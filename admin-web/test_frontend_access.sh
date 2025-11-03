#!/bin/bash

# 快速测试前端访问脚本

echo "========================================"
echo "  前端访问测试"
echo "========================================"
echo ""

echo "=== 1. 测试 index.html ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
echo "HTTP 状态码: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ index.html 可访问"
else
    echo "❌ index.html 无法访问"
fi
echo ""

echo "=== 2. 测试 JS 文件 ==="
JS_FILE="/assets/index-BRtCtJ5k.js"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost$JS_FILE)
echo "测试: http://localhost$JS_FILE"
echo "HTTP 状态码: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ JS 文件可访问"
else
    echo "❌ JS 文件无法访问"
fi
echo ""

echo "=== 3. 测试 CSS 文件 ==="
CSS_FILE="/assets/index-BIrMmdEh.css"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost$CSS_FILE)
echo "测试: http://localhost$CSS_FILE"
echo "HTTP 状态码: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ CSS 文件可访问"
else
    echo "❌ CSS 文件无法访问"
fi
echo ""

echo "=== 4. 测试外部访问 ==="
echo "测试: http://118.25.70.79/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://118.25.70.79/)
echo "HTTP 状态码: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 外部访问正常"
    echo ""
    echo "获取页面内容的前100字符:"
    curl -s http://118.25.70.79/ | head -c 100
    echo ""
else
    echo "❌ 外部访问失败"
fi
echo ""

echo "=== 5. 检查防火墙状态 ==="
sudo ufw status | head -5
echo ""

echo "========================================"
echo "  测试完成"
echo "========================================"
echo ""
echo "如果所有测试都返回 200，说明服务器配置正常"
echo "如果页面还是不显示，可能是浏览器缓存问题"
echo "请尝试："
echo "1. 使用无痕模式访问 http://118.25.70.79"
echo "2. 清除浏览器缓存后刷新 (Ctrl+Shift+R)"
echo "3. 检查浏览器控制台(F12)是否有错误"
echo ""

