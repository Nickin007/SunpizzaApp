# 活动日志系统部署指南

## 概述
本次更新为APP首页的"最新动态"功能添加了真实数据支持，包括工单创建、状态变更、评论添加等实时活动记录。

## 功能特性

### 后端改动
1. **新增 `ActivityLog` 模型**
   - 记录各种工单相关操作
   - 支持的操作类型：
     - `work_order_created` - 工单创建
     - `work_order_status_changed` - 工单状态变更
     - `work_order_assigned` - 工单分配
     - `work_order_comment` - 工单评论
     - `work_order_image_added` - 工单图片添加

2. **自动日志记录**
   - 工单创建时自动记录
   - 工单状态变更时自动记录
   - 添加评论时自动记录
   - 工单分配时自动记录

3. **新增API端点**
   - `GET /api/work-orders/activities` - 获取活动日志列表
   - 支持分页
   - 根据角色自动过滤相关数据

### 前端改动 (Flutter APP)
1. **新增 `ActivityService`**
   - 封装活动日志API调用
   - 提供时间格式化工具（相对时间）

2. **首页更新**
   - 从示例数据改为真实API数据
   - 支持下拉刷新
   - 根据操作类型显示不同图标和颜色
   - 显示相对时间（如"5分钟前"）

## 部署步骤

### 1. 数据库迁移

在**服务器**上执行：

```bash
# SSH 连接到服务器
ssh ubuntu@118.89.73.199

# 进入项目目录
cd ~/SunpizzaApp

# 激活虚拟环境
source backend/venv/bin/activate

# 运行迁移脚本
python3 deploy/migrate_activity_logs.py

# 确认迁移成功后退出虚拟环境
deactivate
```

### 2. 上传后端文件

在**本地PowerShell**中执行：

```powershell
# 设置工作目录
cd C:\Users\YQH20\Desktop\SunpizzaApp

# 上传修改的文件
scp backend/app/models.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/
scp backend/app/api/work_orders.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/
scp backend/app/api/users.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/
```

### 3. 重启后端服务

在**服务器**上执行：

```bash
# 重启后端服务
sudo systemctl restart sunpizza-backend

# 检查服务状态
sudo systemctl status sunpizza-backend

# 查看日志（可选）
sudo journalctl -u sunpizza-backend -f
```

### 4. 测试APP

1. 重新运行 Flutter APP
2. 登录账号
3. 查看首页"最新动态"部分
4. 创建新工单，观察动态是否实时更新
5. 修改工单状态，观察动态记录
6. 添加评论，观察动态记录

## 验证清单

- [ ] 数据库迁移成功
- [ ] 后端服务正常启动
- [ ] APP首页能显示真实的活动数据
- [ ] 创建工单后，动态列表有新记录
- [ ] 修改工单状态后，动态列表有新记录
- [ ] 添加评论后，动态列表有新记录
- [ ] 下拉刷新能正常工作
- [ ] 时间显示格式正确（如"5分钟前"）

## 注意事项

1. **数据库迁移**：确保在执行迁移脚本前已备份数据库
2. **服务重启**：重启后端服务会导致短暂的服务不可用（约2-3秒）
3. **权限过滤**：
   - 管理员可以看到所有活动
   - 区域经理可以看到所有活动
   - 店长只能看到与自己相关的工单活动
4. **性能考虑**：默认每次加载最新10条活动，可根据需要调整

## 故障排除

### 问题1：APP显示"暂无动态"
**原因**：数据库中还没有活动记录  
**解决**：创建几个工单、修改状态、添加评论，生成一些活动记录

### 问题2：时间显示不正确
**原因**：服务器时区设置问题  
**解决**：检查服务器时区设置，确保与本地时区一致

### 问题3：后端服务启动失败
**原因**：可能是数据库迁移失败或代码错误  
**解决**：
```bash
# 查看错误日志
sudo journalctl -u sunpizza-backend -n 50 --no-pager

# 检查数据库表是否创建成功
mysql -u root -p sunpizza -e "SHOW TABLES LIKE 'activity_logs';"
```

## 后续优化建议

1. **性能优化**：
   - 为 `activity_logs` 表的 `created_at` 字段添加索引（已包含在迁移脚本中）
   - 定期清理旧的活动记录（如保留最近30天）

2. **功能扩展**：
   - 添加"查看更多"按钮，支持加载更多历史记录
   - 点击活动卡片跳转到对应的工单详情页
   - 支持按类型筛选活动（如只看状态变更）

3. **用户体验**：
   - 添加骨架屏加载效果
   - 新活动到来时显示红点提示
   - 支持实时推送（WebSocket）

## 相关文件

### 后端文件
- `backend/app/models.py` - ActivityLog 模型定义
- `backend/app/api/work_orders.py` - 活动记录逻辑和API端点
- `deploy/migrate_activity_logs.py` - 数据库迁移脚本

### 前端文件
- `frontend/lib/services/activity_service.dart` - 活动服务
- `frontend/lib/screens/home/dashboard_screen.dart` - 首页（显示动态）

## 更新日志

**版本**: 1.0.0  
**日期**: 2025-10-11  
**作者**: Assistant

### 新增功能
- ✅ 活动日志系统
- ✅ 自动记录工单操作
- ✅ 首页实时动态显示
- ✅ 相对时间格式化

### 修复问题
- ✅ 首页动态数据为示例数据的问题
- ✅ 用户创建时"店长必须关联门店"的验证错误

