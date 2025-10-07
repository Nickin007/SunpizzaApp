#!/bin/bash

# 圣比萨智能门店管理平台 - 一键部署脚本
# 自动执行所有部署步骤

set -e

echo "========================================"
echo "🚀 圣比萨智能门店管理平台"
echo "    一键部署脚本"
echo "========================================"
echo ""
echo "⚠️  开始部署前，请确认："
echo "  1. 你已通过 SSH 连接到服务器"
echo "  2. backend 目录已上传到 /home/ubuntu/SunpizzaApp/"
echo "  3. deploy 目录已上传到 /home/ubuntu/SunpizzaApp/"
echo ""
read -p "确认继续？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 部署已取消"
    exit 1
fi

echo ""
echo "开始部署..."
echo ""

# 确保在正确的目录
cd /home/ubuntu/SunpizzaApp/deploy

# 给所有脚本添加执行权限
chmod +x *.sh

echo "====== 步骤 1/4：安装基础环境 ======"
./server_setup.sh

echo ""
echo "====== 步骤 2/4：配置 MySQL ======"
./mysql_setup.sh

echo ""
echo "====== 步骤 3/4：部署 Flask 后端 ======"
./deploy_backend.sh

echo ""
echo "====== 步骤 4/4：配置 Nginx ======"
./nginx_setup.sh

echo ""
echo "========================================"
echo "🎉 部署完成！"
echo "========================================"
echo ""
echo "📝 服务信息："
echo "  API 地址：http://118.89.73.199"
echo "  健康检查：http://118.89.73.199/health"
echo ""
echo "🔍 测试接口："
echo "  curl http://118.89.73.199/health"
echo ""
echo "📋 管理命令："
echo "  查看后端状态：sudo systemctl status sunpizza-backend"
echo "  查看后端日志：tail -f /home/ubuntu/SunpizzaApp/backend/logs/gunicorn_error.log"
echo "  重启后端：sudo systemctl restart sunpizza-backend"
echo ""
echo "⚠️  别忘了："
echo "  1. 在腾讯云控制台配置安全组，开放 80 和 443 端口"
echo "  2. 更新前端配置，改为生产环境"
echo "  3. 重新编译 APK：flutter build apk --release"
echo ""
echo "详细文档请查看：完整部署指南.md"
echo "========================================"

