# 圣比萨智能门店管理平台 - Flutter前端

## 项目说明

这是圣比萨智能门店管理平台的Flutter前端项目，支持iOS、Android和Web平台。

## 技术栈

- **Flutter SDK**: >=3.0.0
- **状态管理**: Provider
- **网络请求**: Dio
- **路由**: GoRouter
- **本地存储**: SharedPreferences
- **UI适配**: flutter_screenutil

## 项目结构

```
lib/
├── core/                    # 核心功能
│   ├── constants/          # 常量定义
│   ├── router/             # 路由配置
│   ├── services/           # 服务层
│   └── theme/              # 主题配置
├── models/                  # 数据模型
├── providers/               # 状态管理
├── screens/                 # 页面
│   ├── auth/               # 认证相关
│   ├── home/               # 主页
│   ├── work_orders/        # 工单
│   ├── routine_tasks/      # 清洁任务
│   ├── training/           # 培训
│   └── profile/            # 个人中心
└── main.dart               # 应用入口
```

## 开发指南

### 1. 环境配置

```bash
# 安装依赖
flutter pub get

# 检查环境
flutter doctor
```

### 2. 运行项目

```bash
# iOS
flutter run -d ios

# Android
flutter run -d android

# Web
flutter run -d chrome
```

### 3. 构建发布版本

```bash
# iOS
flutter build ios --release

# Android
flutter build apk --release
flutter build appbundle --release

# Web
flutter build web --release
```

## 配置API地址

修改 `lib/core/constants/api_constants.dart` 中的 `baseUrl`：

```dart
static const String baseUrl = 'http://your-api-domain.com';
```

或使用编译时配置：

```bash
flutter run --dart-define=API_BASE_URL=http://your-api-domain.com
```

## 功能模块

### 已实现
- ✅ 登录认证
- ✅ Token管理
- ✅ API封装
- ✅ 状态管理基础架构
- ✅ 路由配置

### 待开发
- ⏳ 主页Dashboard
- ⏳ 工单列表与详情
- ⏳ 创建/编辑工单
- ⏳ 清洁任务管理
- ⏳ 培训系统
- ⏳ 个人中心
- ⏳ 消息推送
- ⏳ 文件上传

## 测试账号

- **管理员**: admin / admin123
- **区域经理**: manager1 / 123456
- **店长**: shopmanager1 / 123456

## 注意事项

1. 首次运行需要配置正确的API地址
2. iOS平台需要配置证书和Provisioning Profile
3. Android平台需要配置签名文件
4. Web平台需要配置CORS跨域

## 后续开发计划

1. 完善所有功能页面UI
2. 实现业务逻辑
3. 添加单元测试和集成测试
4. 性能优化
5. 国际化支持

---

© 2025 圣比萨 (Sunpizza)

