#!/bin/bash

# Nginx 配置脚本

set -e

echo "========================================"
echo "🌐 配置 Nginx 反向代理"
echo "========================================"
echo ""

# 创建 Nginx 配置文件
echo "⚙️  创建 Nginx 配置..."
sudo tee /etc/nginx/sites-available/sunpizza > /dev/null << 'EOF'
server {
    listen 80;
    server_name 118.89.73.199;  # 公网 IP

    # 客户端上传文件大小限制
    client_max_body_size 20M;

    # API 请求代理到 Flask
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件（如果需要）
    location /uploads/ {
        alias /home/ubuntu/SunpizzaApp/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }

    # 访问日志
    access_log /var/log/nginx/sunpizza_access.log;
    error_log /var/log/nginx/sunpizza_error.log;
}
EOF

# 创建软链接启用站点
echo "🔗 启用站点配置..."
sudo ln -sf /etc/nginx/sites-available/sunpizza /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
echo "✅ 测试 Nginx 配置..."
sudo nginx -t

# 重启 Nginx
echo "🔄 重启 Nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ Nginx 配置完成！"
echo ""
echo "现在可以通过以下地址访问："
echo "  http://118.89.73.199/health"
echo ""

