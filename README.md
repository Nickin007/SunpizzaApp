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

- **移动端**: Flutter (iOS、Android)
- **Web 管理后台**: Flutter Web
- **后端**: Python Flask (RESTful API)
- **数据库**: MySQL 8.0+
- **部署**: 腾讯云 Ubuntu 22.04、Nginx、Gunicorn

## 项目结构

```
SunpizzaApp/
├── backend/                    # Flask 后端
│   ├── app/                    # 应用主目录
│   │   ├── __init__.py        # 应用工厂
│   │   ├── models.py          # 数据库模型（14个表）
│   │   ├── api/               # RESTful API
│   │   │   ├── users.py       # 用户管理 API
│   │   │   ├── shops.py       # 门店管理 API
│   │   │   ├── work_orders.py # 工单任务 API
│   │   │   ├── training.py    # 培训系统 API
│   │   │   └── routine_tasks.py # 清洁任务 API
│   │   └── utils/             # 工具类
│   │       ├── auth.py        # JWT 认证
│   │       └── response.py    # 统一响应格式
│   ├── config.py              # 配置文件
│   ├── wsgi.py                # WSGI 应用入口（Gunicorn）
│   ├── init_db.py             # 数据库初始化脚本
│   ├── test_connection.py     # 数据库连接测试
│   ├── requirements.txt       # Python 依赖
│   ├── venv/                  # Python 虚拟环境（不提交到 Git）
│   ├── .env                   # 环境变量配置（不提交到 Git）
│   └── .gitignore
│
├── frontend/                   # Flutter 项目（移动端 + Web 管理后台）
│   ├── lib/
│   │   ├── main.dart          # 移动端入口
│   │   ├── core/              # 核心功能（共享）
│   │   │   ├── config/
│   │   │   │   └── environment.dart  # 环境配置（开发/生产）
│   │   │   ├── constants/
│   │   │   │   ├── api_constants.dart # API 端点
│   │   │   │   └── app_colors.dart    # 颜色常量
│   │   │   ├── router/
│   │   │   │   └── app_router.dart    # 路由配置（GoRouter）
│   │   │   ├── services/
│   │   │   │   ├── api_service.dart   # API 服务
│   │   │   │   └── storage_service.dart # 本地存储
│   │   │   └── theme/
│   │   │       └── app_theme.dart     # 应用主题
│   │   ├── models/            # 数据模型（共享）
│   │   │   ├── user_model.dart        # 用户模型
│   │   │   ├── shop_model.dart        # 门店模型
│   │   │   └── work_order_model.dart  # 工单模型
│   │   ├── providers/         # 状态管理（Provider，共享）
│   │   │   ├── auth_provider.dart     # 认证状态
│   │   │   ├── shop_provider.dart     # 门店状态
│   │   │   └── work_order_provider.dart # 工单状态
│   │   ├── screens/           # 页面
│   │   │   ├── auth/          # 登录页（移动端）
│   │   │   │   └── login_screen.dart
│   │   │   ├── main/          # 主框架
│   │   │   │   └── main_screen.dart
│   │   │   ├── home/          # 首页
│   │   │   │   └── dashboard_screen.dart
│   │   │   ├── work_orders/   # 工单模块
│   │   │   │   ├── work_order_center_screen.dart
│   │   │   │   ├── work_order_detail_screen.dart
│   │   │   │   ├── work_order_comment_screen.dart
│   │   │   │   └── create_work_order_screen.dart
│   │   │   ├── routine_tasks/ # 清洁任务
│   │   │   │   └── routine_task_screen.dart
│   │   │   ├── training/      # 培训模块
│   │   │   │   ├── training_center_screen.dart
│   │   │   │   ├── course_list_screen.dart
│   │   │   │   └── course_detail_screen.dart
│   │   │   └── profile/       # 个人中心
│   │   │       └── profile_center_screen.dart
│   │   └── widgets/           # 通用组件
│   │       ├── stat_circle_card.dart  # 统计圆环卡片
│   │       ├── quick_action_button.dart # 快捷按钮
│   │       ├── work_order_card.dart   # 工单卡片
│   │       └── course_card.dart       # 课程卡片
│   ├── assets/                # 资源文件
│   │   └── images/
│   │       └── logo.png       # 圣比萨 Logo
│   ├── android/               # Android 配置
│   │   ├── app/
│   │   │   ├── build.gradle.kts
│   │   │   └── src/main/AndroidManifest.xml
│   │   ├── build.gradle.kts
│   │   └── gradle.properties
│   ├── ios/                   # iOS 配置
│   │   ├── Runner/
│   │   │   └── Info.plist
│   │   └── Runner.xcodeproj/
│   ├── web/                   # Web 配置
│   │   ├── index.html
│   │   ├── manifest.json
│   │   ├── favicon.png
│   │   └── icons/             # PWA 图标
│   ├── linux/                 # Linux 桌面配置
│   ├── macos/                 # macOS 配置
│   ├── windows/               # Windows 桌面配置
│   ├── test/                  # 测试文件
│   │   └── widget_test.dart
│   ├── build/                 # 构建输出（不提交到 Git）
│   ├── pubspec.yaml           # Flutter 依赖
│   ├── pubspec.lock           # 依赖锁定
│   ├── analysis_options.yaml  # 代码分析配置
│   ├── UI优化说明.md           # UI 优化文档
│   └── .gitignore
│
├── docs/                       # 项目文档
│   ├── API文档.md              # 完整 API 接口文档
│   └── 数据库设计.md           # 数据库表结构设计
│
├── deploy/                     # 部署脚本（Shell）
│   ├── 完整部署指南.md         # 详细部署步骤
│   ├── test_api.sh            # API 接口测试脚本
│   ├── server_setup.sh        # 服务器基础环境设置
│   ├── mysql_setup.sh         # MySQL 安装配置
│   ├── deploy_backend.sh      # 后端部署脚本
│   ├── nginx_setup.sh         # Nginx 反向代理配置
│   ├── finish_service.sh      # 服务启动脚本
│   └── 一键部署.sh            # 一键部署所有服务
│
├── README.md                   # 项目总览（本文件）
└── 快速启动.md                 # 快速启动指南
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

### 移动端设置

1. **环境要求**
   - Flutter SDK 3.0+
   - Android Studio / Xcode（用于真机调试）

2. **安装依赖**
   ```bash
   cd frontend
   flutter pub get
   ```

3. **配置环境**
   编辑 `lib/core/config/environment.dart`：
   - 开发环境：`developmentApiUrl` - 本地电脑 IP + 5000端口
   - 生产环境：`productionApiUrl` - 云服务器地址

4. **运行移动端**
   ```bash
   # Chrome 浏览器预览
   flutter run -d chrome
   
   # Android 真机
   flutter run -d <设备ID>
   
   # iOS 真机（需要 macOS）
   flutter run -d <设备ID>
   ```

5. **构建 APK**
   ```bash
   flutter build apk --release
   # 生成的 APK 在 build/app/outputs/flutter-apk/
   ```

### Web 管理后台设置

1. **运行开发模式**
   ```bash
   cd frontend
   flutter run -d chrome -t lib/main_web.dart
   ```

2. **构建生产版本**
   ```bash
   flutter build web -t lib/main_web.dart
   # 生成的文件在 build/web/
   ```

3. **部署到 Nginx**
   将 `build/web/` 目录上传到服务器：
   ```bash
   scp -r build/web/* ubuntu@your-server:/var/www/admin
   ```

4. **访问地址**
   - 开发环境：`http://localhost:<port>`
   - 生产环境：`http://your-domain/admin`

⚠️ **注意：** Web 管理后台仅允许管理员账号登录

## 平台对比

| 特性 | 移动端 App | Web 管理后台 |
|-----|-----------|-------------|
| **目标用户** | 店长、区域经理、管理员 | 仅管理员 |
| **主要用途** | 日常工单处理、培训学习 | 系统管理、数据维护 |
| **UI 设计** | 移动端优化、触摸友好 | 桌面端优化、表格为主 |
| **代码复用** | - | 复用移动端 70%+ 代码 |
| **部署方式** | App Store / APK | Nginx 静态托管 |
| **访问方式** | 下载安装 | 浏览器访问 |
| **离线能力** | 支持 | 不支持 |

### 为什么用 Flutter Web 做管理后台？

✅ **代码复用率高** - 复用移动端的 models、services、providers  
✅ **统一技术栈** - 一套代码，维护简单  
✅ **开发效率高** - 不需要学习新框架  
✅ **品牌一致性** - UI 风格与移动端统一  
✅ **适合内部系统** - 管理后台是内部工具，不需要 SEO

## 用户角色与权限

| 角色 | 移动端权限 | Web 管理后台权限 |
|------|-----------|----------------|
| **管理员 (admin)** | 全部功能 | ✅ 可登录，拥有全部管理权限 |
| **区域经理 (regional_manager)** | 工单管理、数据查看 | ❌ 不可登录 |
| **店长 (shop_manager)** | 工单处理、培训学习 | ❌ 不可登录 |

### 权限说明

**移动端（App）：**
- ✅ 所有角色都可以登录
- 根据角色显示不同功能和数据

**Web 管理后台：**
- ✅ 仅管理员可以登录
- 用于系统管理和数据维护
- 功能包括：
  - 用户管理（创建、编辑、删除用户）
  - 门店管理（新增、编辑门店信息）
  - 工单管理（查看、编辑、删除所有工单）
  - 培训内容管理（创建、编辑课程）
  - 字典表管理（任务类型、优先级、状态）
  - 数据统计与导出
  - 系统设置

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

## 开发进度

### ✅ 已完成
- ✅ 后端 API 全部实现（Flask + MySQL）
- ✅ 数据库设计与初始化脚本
- ✅ JWT 认证与权限控制
- ✅ 移动端 UI 设计（Flutter）
  - ✅ 登录页面（红色科技风 + 品牌 Logo）
  - ✅ 首页仪表盘
  - ✅ 工单管理
  - ✅ 培训中心
  - ✅ 个人中心
- ✅ 环境配置系统（开发/生产环境自动切换）
- ✅ 云服务器部署（腾讯云 + Nginx + Gunicorn）
- ✅ Android APK 打包与真机调试

### 🔄 进行中
- 🔄 Web 管理后台开发
  - [ ] 管理员登录页
  - [ ] 仪表盘（数据统计）
  - [ ] 用户管理（增删改查、重置密码）
  - [ ] 门店管理（增删改查）
  - [ ] 工单管理（查看、编辑、删除）
  - [ ] 培训内容管理
  - [ ] 系统设置

### 📋 待开发
- [ ] 文件上传功能优化
- [ ] 推送通知集成
- [ ] 定时任务（自动生成日清/周清/月清任务）
- [ ] 数据导出功能（Excel/CSV）
- [ ] iOS 打包与发布
- [ ] 单元测试与集成测试
- [ ] 操作日志系统
- [ ] 数据备份功能

## 联系方式

如有问题，请联系项目负责人。

## 许可证

本项目为圣比萨公司内部项目，未经授权不得传播和使用。

---

© 2025 圣比萨 (Sunpizza) - 智能门店管理平台

