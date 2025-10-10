#!/bin/bash

# ============================================================
#  更新课程管理规则（软删除 + 灵活编辑）
# ============================================================

SERVER_IP="118.89.73.199"
SERVER_USER="ubuntu"
PROJECT_DIR="~/SunpizzaApp"

echo "============================================================"
echo "  更新课程管理规则"
echo "============================================================"

# 1. 上传后端文件
echo ""
echo "1. 上传后端API文件..."
scp backend/app/api/training.py ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/backend/app/api/

echo "✅ 后端文件上传完成"

# 2. 重启后端服务
echo ""
echo "2. 重启后端服务..."
ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl restart sunpizza-backend"

# 3. 检查服务状态
echo ""
echo "3. 检查服务状态..."
ssh ${SERVER_USER}@${SERVER_IP} "sudo systemctl status sunpizza-backend --no-pager | head -n 15"

echo ""
echo "============================================================"
echo "✅ 部署完成！"
echo "============================================================"
echo ""
echo "新的课程管理规则："
echo ""
echo "📝 编辑："
echo "  • 任何时候都可以编辑课程（无限制）"
echo ""
echo "🗑️ 删除："
echo "  • 已发布的课程：不能删除（Web端显示禁用状态）"
echo "  • 未发布的课程：可以删除"
echo ""
echo "💡 使用流程："
echo "  1. 创建课程 → 编辑内容 → 发布"
echo "  2. 需要下架时 → 设置为"未发布""
echo "  3. 确认不再需要时 → 删除课程"
echo ""
echo "前端需要构建并部署才能看到UI变化："
echo "  cd admin-web && npm run build"
echo ""

