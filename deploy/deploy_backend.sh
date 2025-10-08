#!/bin/bash

# Flask 后端部署脚本

set -e

echo "========================================"
echo "🚀 部署 Flask 后端应用"
echo "========================================"
echo ""

# 项目目录
PROJECT_DIR="/home/ubuntu/SunpizzaApp"
BACKEND_DIR="${PROJECT_DIR}/backend"

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p ${PROJECT_DIR}

# 如果项目还没上传，提示用户
if [ ! -d "${BACKEND_DIR}" ]; then
    echo "⚠️  后端代码还未上传到服务器"
    echo ""
    echo "请在本地执行以下命令上传代码："
    echo "  scp -r C:\\Users\\YQH20\\Desktop\\SunpizzaApp\\backend ubuntu@118.89.73.199:/home/ubuntu/SunpizzaApp/"
    echo ""
    exit 1
fi

cd ${BACKEND_DIR}

# 创建虚拟环境
echo "🐍 创建 Python 虚拟环境..."
python3 -m venv venv

# 激活虚拟环境并安装依赖
echo "📦 安装 Python 依赖..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # 生产环境 WSGI 服务器

# 创建生产环境配置文件（如果不存在）
if [ ! -f "${BACKEND_DIR}/.env" ]; then
    echo "⚙️  创建生产环境配置..."
    cat > ${BACKEND_DIR}/.env << EOF
# 生产环境配置
SECRET_KEY=sunpizza-prod-secret-key-$(openssl rand -hex 16)
JWT_SECRET_KEY=sunpizza-jwt-prod-secret-$(openssl rand -hex 16)

# MySQL 配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YYyy1q2w3e
MYSQL_DB=sunpizza_db

# 文件上传
UPLOAD_FOLDER=/home/ubuntu/SunpizzaApp/backend/uploads
EOF
else
    echo "✅ .env 文件已存在，跳过生成"
fi

# 初始化数据库
echo "🗄️  初始化数据库..."
python init_db.py

# 创建 Gunicorn 配置文件
echo "⚙️  创建 Gunicorn 配置..."
cat > ${BACKEND_DIR}/gunicorn_config.py << EOF
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

# 创建日志目录
mkdir -p ${BACKEND_DIR}/logs

# 创建 systemd 服务文件
echo "🔧 创建系统服务..."
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
sudo systemctl start sunpizza-backend
sudo systemctl enable sunpizza-backend

echo ""
echo "✅ Flask 后端部署完成！"
echo ""
echo "服务状态："
sudo systemctl status sunpizza-backend --no-pager
echo ""
echo "日志路径："
echo "  访问日志：${BACKEND_DIR}/logs/gunicorn_access.log"
echo "  错误日志：${BACKEND_DIR}/logs/gunicorn_error.log"
echo ""

