#!/bin/bash

# 圣比萨智能门店管理平台 - 服务器自动部署脚本
# Ubuntu 22.04

set -e  # 遇到错误立即退出

echo "========================================"
echo "🚀 圣比萨智能门店管理平台 - 服务器部署"
echo "========================================"
echo ""

# 更新系统
echo "📦 更新系统包..."
sudo apt update
sudo apt upgrade -y

# 安装基础工具
echo "🔧 安装基础工具..."
sudo apt install -y wget curl git vim unzip

# 安装 Python 3.10 和相关工具
echo "🐍 安装 Python 3.10..."
sudo apt install -y python3 python3-pip python3-venv python3-dev

# 安装 MySQL 8.0
echo "🗄️  安装 MySQL 8.0..."
sudo apt install -y mysql-server mysql-client libmysqlclient-dev

# 启动 MySQL 服务
echo "▶️  启动 MySQL 服务..."
sudo systemctl start mysql
sudo systemctl enable mysql

# 安装 Nginx
echo "🌐 安装 Nginx..."
sudo apt install -y nginx

# 启动 Nginx 服务
echo "▶️  启动 Nginx 服务..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 配置防火墙
echo "🔥 配置防火墙..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5000/tcp  # Flask (临时，后面会通过 Nginx 代理)
echo "y" | sudo ufw enable

echo ""
echo "✅ 基础环境安装完成！"
echo ""
echo "下一步："
echo "1. 配置 MySQL root 密码"
echo "2. 创建数据库和用户"
echo "3. 部署 Flask 应用"
echo ""

