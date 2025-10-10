#!/bin/bash

# 前端服务器 Nginx 配置脚本（前后端分离架构）

echo "========================================"
echo "  圣比萨管理后台 - 前端服务器配置"
echo "========================================"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  警告：请不要使用 root 用户运行此脚本"
  echo "请使用 sudo 执行需要权限的命令"
  exit 1
fi

# 步骤 1: 安装 Nginx
echo "📦 步骤 1/5: 检查 Nginx 安装..."
if ! command -v nginx &> /dev/null; then
    echo "Nginx 未安装，正在安装..."
    sudo apt update
    sudo apt install nginx -y
    echo "✅ Nginx 安装完成"
else
    echo "✅ Nginx 已安装"
fi
echo ""

# 步骤 2: 设置文件权限
echo "🔐 步骤 2/5: 设置文件权限..."
sudo chown -R www-data:www-data ~/SunpizzaApp/admin-web/dist
sudo chmod -R 755 ~/SunpizzaApp/admin-web/dist
echo "✅ 文件权限设置完成"
echo ""

# 步骤 3: 创建 Nginx 配置文件（前后端分离版本）
echo "📝 步骤 3/5: 创建 Nginx 配置文件..."

sudo tee /etc/nginx/sites-available/sunpizza-admin > /dev/null <<'EOF'
server {
    listen 80;
    server_name 118.25.70.79;

    # 前端静态文件
    location / {
        root /home/ubuntu/SunpizzaApp/admin-web/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 不需要代理后端，前端直接访问后端服务器
    # 后端地址：http://118.89.73.199:5000/api

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;
    gzip_min_length 1000;

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /home/ubuntu/SunpizzaApp/admin-web/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 访问日志
    access_log /var/log/nginx/sunpizza-admin-access.log;
    error_log /var/log/nginx/sunpizza-admin-error.log;
}
EOF

echo "✅ Nginx 配置文件创建完成"
echo ""

# 步骤 4: 启用配置
echo "🔗 步骤 4/5: 启用 Nginx 配置..."

# 删除旧的软链接（如果存在）
sudo rm -f /etc/nginx/sites-enabled/sunpizza-admin
sudo rm -f /etc/nginx/sites-enabled/default

# 创建新的软链接
sudo ln -s /etc/nginx/sites-available/sunpizza-admin /etc/nginx/sites-enabled/

# 测试配置
echo "🧪 测试 Nginx 配置..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx 配置测试失败！"
    exit 1
fi

echo "✅ Nginx 配置测试通过"
echo ""

# 步骤 5: 重启 Nginx
echo "🔄 步骤 5/5: 重启 Nginx 服务..."
sudo systemctl restart nginx
sudo systemctl enable nginx

if [ $? -ne 0 ]; then
    echo "❌ Nginx 重启失败！"
    echo "请检查日志：sudo tail -f /var/log/nginx/error.log"
    exit 1
fi

echo "✅ Nginx 服务重启成功"
echo ""

# 检查服务状态
echo "📊 检查服务状态..."
sudo systemctl status nginx --no-pager | head -n 10
echo ""

# 完成提示
echo "========================================"
echo "  ✅ 前端部署完成！"
echo "========================================"
echo ""
echo "🌐 访问地址："
echo "   http://118.25.70.79"
echo ""
echo "🔗 后端 API 地址："
echo "   http://118.89.73.199:5000/api"
echo ""
echo "📝 架构说明："
echo "   - 前端服务器：118.25.70.79 (当前服务器)"
echo "   - 后端服务器：118.89.73.199:5000"
echo "   - 前端直接通过 HTTP 请求访问后端"
echo ""
echo "⚠️  重要提示："
echo "   1. 确保后端服务器 118.89.73.199:5000 可以访问"
echo "   2. 确保后端已配置 CORS 允许跨域请求"
echo "   3. 建议后续配置 HTTPS 提升安全性"
echo ""
echo "📝 常用命令："
echo "   查看 Nginx 状态：sudo systemctl status nginx"
echo "   重启 Nginx：sudo systemctl restart nginx"
echo "   查看错误日志：sudo tail -f /var/log/nginx/sunpizza-admin-error.log"
echo "   查看访问日志：sudo tail -f /var/log/nginx/sunpizza-admin-access.log"
echo ""
echo "🔧 故障排查："
echo "   1. 检查防火墙：sudo ufw status"
echo "   2. 检查端口占用：sudo netstat -tlnp | grep :80"
echo "   3. 检查文件权限：ls -la ~/SunpizzaApp/admin-web/dist"
echo "   4. 测试后端连接：curl http://118.89.73.199:5000/api/"
echo ""

