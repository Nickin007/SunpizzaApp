#!/bin/bash

# 圣比萨后端服务配置脚本
# 用于创建 Gunicorn 配置和 systemd 服务
# 适用场景：数据库已初始化，只需创建/重启服务

set -e

echo "========================================"
echo "🔧 配置后端服务"
echo "========================================"
echo ""

# 项目目录
PROJECT_DIR="/home/ubuntu/SunpizzaApp"
BACKEND_DIR="${PROJECT_DIR}/backend"

# 检查后端目录是否存在
if [ ! -d "${BACKEND_DIR}" ]; then
    echo "❌ 后端目录不存在: ${BACKEND_DIR}"
    echo "请先上传后端代码"
    exit 1
fi

# 检查虚拟环境是否存在
if [ ! -d "${BACKEND_DIR}/venv" ]; then
    echo "❌ 虚拟环境不存在"
    echo "请先运行 deploy_backend.sh 或手动创建虚拟环境"
    exit 1
fi

cd ${BACKEND_DIR}

# 创建日志目录
echo "📁 创建日志目录..."
mkdir -p ${BACKEND_DIR}/logs

# 创建 Gunicorn 配置文件
echo "⚙️  创建 Gunicorn 配置..."
cat > ${BACKEND_DIR}/gunicorn_config.py << 'EOF'
# Gunicorn 配置文件
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# 日志
accesslog = "/home/ubuntu/SunpizzaApp/backend/logs/gunicorn_access.log"
errorlog = "/home/ubuntu/SunpizzaApp/backend/logs/gunicorn_error.log"
loglevel = "info"

# 进程命名
proc_name = "sunpizza_backend"

# Daemon
daemon = False
pidfile = "/home/ubuntu/SunpizzaApp/backend/gunicorn.pid"
EOF

# 创建 systemd 服务文件
echo "🔧 创建 systemd 服务..."
sudo tee /etc/systemd/system/sunpizza-backend.service > /dev/null << EOF
[Unit]
Description=Sunpizza Backend API Service
After=network.target mysql.service

[Service]
Type=notify
User=ubuntu
Group=ubuntu
WorkingDirectory=${BACKEND_DIR}
Environment="PATH=${BACKEND_DIR}/venv/bin"
ExecStart=${BACKEND_DIR}/venv/bin/gunicorn -c ${BACKEND_DIR}/gunicorn_config.py wsgi:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd 并启动服务
echo "▶️  启动后端服务..."
sudo systemctl daemon-reload
sudo systemctl enable sunpizza-backend

# 检查服务是否已在运行
if sudo systemctl is-active --quiet sunpizza-backend; then
    echo "🔄 服务已在运行，正在重启..."
    sudo systemctl restart sunpizza-backend
else
    echo "🚀 首次启动服务..."
    sudo systemctl start sunpizza-backend
fi

echo ""
echo "✅ 服务配置完成！"
echo ""
echo "📊 服务状态："
sudo systemctl status sunpizza-backend --no-pager || true
echo ""
echo "📝 管理命令："
echo "  查看状态：sudo systemctl status sunpizza-backend"
echo "  查看日志：tail -f ${BACKEND_DIR}/logs/gunicorn_error.log"
echo "  重启服务：sudo systemctl restart sunpizza-backend"
echo "  停止服务：sudo systemctl stop sunpizza-backend"
echo ""
echo "🔍 测试接口："
echo "  curl http://127.0.0.1:5000/health"
echo "  curl http://118.89.73.199/health"
echo ""

