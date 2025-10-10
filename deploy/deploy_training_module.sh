#!/bin/bash

# ============================================================
#  圣比萨 - 培训模块快速部署脚本
# ============================================================

SERVER_IP="118.89.73.199"
SERVER_USER="ubuntu"
PROJECT_DIR="~/SunpizzaApp"

echo "============================================================"
echo "  培训模块快速部署"
echo "============================================================"

# 1. 上传前端新增文件
echo ""
echo "1. 上传前端新增文件..."

# 培训模块API和类型
scp admin-web/src/api/training.ts ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/admin-web/src/api/
scp admin-web/src/types/index.ts ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/admin-web/src/types/

# 培训模块页面
scp -r admin-web/src/pages/Training ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/admin-web/src/pages/

# 路由和布局
scp admin-web/src/router/index.tsx ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/admin-web/src/router/
scp -r admin-web/src/layouts/MainLayout ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/admin-web/src/layouts/

# package.json
scp admin-web/package.json ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/admin-web/

echo "✅ 前端文件上传完成"

# 2. 在服务器上安装依赖并重新构建
echo ""
echo "2. 安装依赖并构建前端..."
ssh ${SERVER_USER}@${SERVER_IP} "cd ${PROJECT_DIR}/admin-web && npm install && npm run build"

echo "✅ 前端构建完成"

# 3. 检查服务状态
echo ""
echo "3. 检查服务状态..."
ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl status sunpizza-backend --no-pager | head -n 20"

echo ""
echo "============================================================"
echo "✅ 培训模块部署完成！"
echo "============================================================"
echo ""
echo "访问地址："
echo "  - Web管理端: http://${SERVER_IP}"
echo ""
echo "功能说明："
echo "  1. 课程管理 - 创建、编辑、删除培训课程（视频+文档）"
echo "  2. 题目管理 - 为课程添加考试题目（客观题+主观题）"
echo "  3. 考试审核 - 审核学员的考试答案，评分主观题"
echo ""
echo "提示："
echo "  - 后端API已在之前部署完成"
echo "  - 数据库已在之前迁移完成"
echo "  - Flutter APP端需要重新发布APK"
echo ""

