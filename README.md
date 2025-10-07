# 🍕 圣比萨智能门店管理平台

## 项目概览

圣比萨智能门店管理平台是一个综合性的数字化门店管理系统，通过标准化的任务流和培训体系，提升多门店运营效率、保证服务质量与品牌一致性。

### 核心功能

- **店务系统**
  - 双向工单任务系统（上行提报 + 下行分配）
  - 标准清洁模块（日清/周清/月清）
  - 全量数据归档与溯源

- **培训系统**
  - 产品类培训（图文、视频、考核）
  - 服务类培训（话术、SOP流程）
  - 运营程序类培训（岗位手册、品牌手册）

### 技术架构

- **前端**: Flutter (iOS、Android、Web)
- **后端**: Python Flask (RESTful API)
- **数据库**: MySQL 8.0+

## 项目结构

```
SunpizzaApp/
├── backend/                    # Flask后端
│   ├── app/
│   │   ├── __init__.py        # 应用工厂
│   │   ├── models.py          # 数据库模型（14个表）
│   │   ├── api/               # RESTful API
│   │   │   ├── users.py       # 用户管理API
│   │   │   ├── shops.py       # 门店管理API
│   │   │   ├── work_orders.py # 工单任务API
│   │   │   ├── training.py    # 培训系统API
│   │   │   └── routine_tasks.py # 清洁任务API
│   │   └── utils/
│   │       ├── auth.py        # JWT认证
│   │       └── response.py    # 统一响应格式
│   ├── config.py              # 配置文件
│   ├── app.py                 # 应用入口
│   ├── init_db.py             # 数据库初始化脚本
│   ├── requirements.txt       # Python依赖
│   └── .gitignore
│
├── frontend/                   # Flutter前端
│   ├── lib/
│   │   ├── core/              # 核心功能
│   │   │   ├── constants/     # 常量（API地址、颜色等）
│   │   │   ├── router/        # 路由配置
│   │   │   ├── services/      # 服务层（API、存储）
│   │   │   └── theme/         # 主题配置
│   │   ├── models/            # 数据模型
│   │   ├── providers/         # 状态管理（Provider）
│   │   ├── screens/           # 页面
│   │   │   ├── auth/          # 登录页
│   │   │   ├── home/          # 主页
│   │   │   ├── work_orders/   # 工单
│   │   │   ├── routine_tasks/ # 清洁任务
│   │   │   ├── training/      # 培训
│   │   │   └── profile/       # 个人中心
│   │   └── main.dart          # 应用入口
│   ├── pubspec.yaml           # Flutter依赖
│   ├── README.md
│   └── .gitignore
│
├── docs/                       # 项目文档
│   ├── API文档.md
│   ├── 数据库设计.md
│   ├── 部署指南.md
│   └── 快速启动指南.md
│
└── README.md                   # 项目总览
```

## 快速开始

### 后端设置

1. **环境要求**
   - Python 3.9+
   - MySQL 8.0+

2. **安装依赖**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **配置数据库**
   - 创建MySQL数据库：
     ```sql
     CREATE DATABASE sunpizza_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
   - 复制环境变量文件：
     ```bash
     cp .env.example .env
     ```
   - 编辑 `.env` 文件，配置数据库连接信息

4. **初始化数据库**
   ```bash
   python init_db.py
   ```
   
   这将创建所有表并初始化：
   - 6种任务类型（稽查整改、营销活动、设备报修、物料申请、人员调度、其他）
   - 3个优先级（低、中、高）
   - 4个状态（待受理、进行中、已完成、已关闭）
   - 默认管理员账户（用户名：admin，密码：admin123）
   - 示例门店和用户数据

5. **启动后端服务**
   ```bash
   python app.py
   ```
   
   服务将在 `http://localhost:5000` 启动

### API文档

#### 认证接口

- **POST** `/api/users/login` - 用户登录
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```

- **POST** `/api/users/register` - 注册新用户（需管理员权限）

#### 工单接口

- **GET** `/api/work-orders/` - 获取工单列表
- **GET** `/api/work-orders/{id}` - 获取工单详情
- **POST** `/api/work-orders/` - 创建工单
- **PUT** `/api/work-orders/{id}` - 更新工单
- **POST** `/api/work-orders/{id}/comments` - 添加评论

#### 门店接口

- **GET** `/api/shops/` - 获取门店列表
- **POST** `/api/shops/` - 创建门店（需管理员权限）
- **PUT** `/api/shops/{id}` - 更新门店（需管理员权限）

#### 清洁任务接口

- **GET** `/api/routine-tasks/templates` - 获取任务模板
- **POST** `/api/routine-tasks/templates` - 创建模板（需管理员权限）
- **GET** `/api/routine-tasks/my-tasks` - 获取我的清洁任务
- **POST** `/api/routine-tasks/{id}/complete` - 完成任务

#### 培训接口

- **GET** `/api/training/categories` - 获取培训分类
- **GET** `/api/training/courses` - 获取课程列表
- **GET** `/api/training/courses/{id}` - 获取课程详情
- **POST** `/api/training/courses/{id}/start` - 开始学习
- **GET** `/api/training/my-records` - 我的学习记录

### 前端设置（待完善）

```bash
cd frontend
flutter pub get
flutter run
```

## 用户角色与权限

| 角色 | 权限说明 |
|------|---------|
| **管理员 (admin)** | 系统全部权限：用户管理、门店管理、字典表维护、全局数据查看 |
| **区域经理 (regional_manager)** | 管辖门店的工单管理、数据查看、任务分配 |
| **店长 (shop_manager)** | 本店工单处理、任务执行、培训学习 |

## 数据库设计

### 核心表

- `users` - 用户表
- `shops` - 门店表
- `work_orders` - 工单任务主表
- `task_comments` - 任务评论表
- `dict_task_type` - 任务类型字典表
- `dict_priority` - 优先级字典表
- `dict_status` - 状态字典表
- `routine_task_templates` - 清洁任务模板表
- `auto_generated_tasks` - 自动生成任务表
- `training_categories` - 培训分类表
- `training_courses` - 培训课程表
- `exam_questions` - 考试题库表
- `learning_records` - 学习记录表

详细的数据库设计请参考需求文档。

## 开发规范

### API响应格式

**成功响应**
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

**错误响应**
```json
{
  "success": false,
  "code": 400,
  "message": "操作失败",
  "errors": {}
}
```

### 认证方式

所有需要认证的接口都使用JWT Token，在请求头中携带：

```
Authorization: Bearer <token>
```

## 测试账户

初始化数据库后，系统会创建以下测试账户：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 系统管理员 |
| manager1 | 123456 | 区域经理 | 张经理 |
| shopmanager1 | 123456 | 店长 | 王府井店-李店长 |
| shopmanager2 | 123456 | 店长 | 三里屯店-王店长 |

⚠️ **生产环境请务必修改默认密码！**

## 后续开发计划

- [ ] 文件上传功能实现
- [ ] 推送通知集成
- [ ] 定时任务（自动生成日清/周清/月清任务）
- [ ] 数据导出功能
- [ ] Flutter前端完整实现
- [ ] Web管理后台界面
- [ ] 单元测试与集成测试

## 联系方式

如有问题，请联系项目负责人。

## 许可证

本项目为圣比萨公司内部项目，未经授权不得传播和使用。

---

© 2025 圣比萨 (Sunpizza) - 智能门店管理平台

