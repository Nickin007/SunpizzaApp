#!/bin/bash

# MySQL 数据库配置脚本

set -e

echo "========================================"
echo "🗄️  配置 MySQL 数据库"
echo "========================================"
echo ""

# MySQL root 密码
MYSQL_ROOT_PASSWORD="YYyy1q2w3e"
DATABASE_NAME="sunpizza_db"
DATABASE_USER="sunpizza_user"
DATABASE_PASSWORD="Sunpizza2025@DB"

echo "📝 配置 MySQL root 密码..."
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo "🔨 创建数据库..."
sudo mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "👤 创建数据库用户..."
sudo mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "CREATE USER IF NOT EXISTS '${DATABASE_USER}'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"
sudo mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "GRANT ALL PRIVILEGES ON ${DATABASE_NAME}.* TO '${DATABASE_USER}'@'localhost';"
sudo mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "FLUSH PRIVILEGES;"

echo ""
echo "✅ MySQL 配置完成！"
echo ""
echo "数据库信息："
echo "  数据库名：${DATABASE_NAME}"
echo "  用户名：${DATABASE_USER}"
echo "  密码：${DATABASE_PASSWORD}"
echo "  主机：localhost"
echo ""

