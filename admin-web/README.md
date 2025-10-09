# 阳光披萨管理后台

一个功能完善的 Web 管理后台系统，用于管理阳光披萨的所有业务数据。

## 🚀 技术栈

- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Ant Design** - UI 组件库
- **Vite** - 构建工具
- **React Router v6** - 路由管理
- **Zustand** - 状态管理
- **Axios** - HTTP 请求
- **Day.js** - 日期处理

## 📦 功能模块

### ✅ 已实现功能

1. **登录认证**
   - 管理员登录（只允许 admin 角色登录）
   - JWT Token 认证
   - 自动保存登录状态

2. **Dashboard 仪表板**
   - 工单统计数据展示
   - 最近工单列表
   - 数据可视化

3. **用户管理**
   - 用户列表（分页）
   - 新增用户
   - 编辑用户信息
   - 删除用户
   - 角色管理（管理员、区域经理、店长、员工）

4. **门店管理**
   - 门店列表（分页）
   - 新增门店
   - 编辑门店信息
   - 删除门店
   - 关联区域经理

5. **工单管理**
   - 工单列表（分页）
   - 新增工单
   - 编辑工单
   - 删除工单
   - 查看工单详情
   - 添加评论
   - 状态流转

6. **字典管理**
   - 查看任务类型
   - 查看优先级
   - 查看工单状态

## 🛠️ 快速开始

### 1. 安装依赖

```bash
cd admin-web
npm install
```

### 2. 配置后端地址

打开 `src/utils/request.ts`，修改后端 API 地址：

```typescript
const request: AxiosInstance = axios.create({
  baseURL: 'http://118.89.73.199:5000/api', // 修改为你的后端地址
  timeout: 30000,
});
```

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器会自动打开 `http://localhost:3000`

### 4. 默认登录账号

- **用户名**：`admin`
- **密码**：`admin123`

## 📂 项目结构

```
admin-web/
├── src/
│   ├── api/              # API 请求封装
│   │   ├── auth.ts       # 认证 API
│   │   ├── users.ts      # 用户 API
│   │   ├── shops.ts      # 门店 API
│   │   ├── workOrders.ts # 工单 API
│   │   └── dict.ts       # 字典 API
│   ├── components/       # 公共组件
│   ├── layouts/          # 布局组件
│   │   └── MainLayout/   # 主布局
│   ├── pages/            # 页面组件
│   │   ├── Login/        # 登录页
│   │   ├── Dashboard/    # 仪表板
│   │   ├── Users/        # 用户管理
│   │   ├── Shops/        # 门店管理
│   │   ├── WorkOrders/   # 工单管理
│   │   └── Dict/         # 字典管理
│   ├── router/           # 路由配置
│   ├── store/            # 状态管理
│   │   └── authStore.ts  # 认证状态
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   │   └── request.ts    # Axios 封装
│   ├── App.tsx           # 应用入口
│   └── main.tsx          # 渲染入口
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎨 主要功能截图

### 登录页面
- 渐变紫色背景
- 卡片式登录表单
- 用户名/密码输入
- 只允许管理员登录

### Dashboard
- 工单统计卡片（总数、待受理、进行中、已完成）
- 最近工单列表
- 数据实时更新

### 用户管理
- 列表展示所有用户
- 支持新增/编辑/删除
- 角色分类（标签颜色区分）
- 关联门店

### 门店管理
- 列表展示所有门店
- 支持新增/编辑/删除
- 关联区域经理
- 地址信息

### 工单管理
- 列表展示所有工单
- 支持新增/编辑/删除
- 详情弹窗查看完整信息
- 评论功能
- 状态/类型/优先级标签展示

### 字典管理
- Tab 切换查看不同字典
- 任务类型、优先级、状态
- 颜色标签展示

## 🔧 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 类型检查
npm run type-check
```

## 📝 API 接口说明

所有 API 请求都会自动添加 JWT Token（从 localStorage 读取）

### 认证
- `POST /api/auth/login` - 登录

### 用户
- `GET /api/users/` - 获取用户列表
- `GET /api/users/:id` - 获取用户详情
- `POST /api/users/` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 门店
- `GET /api/shops/` - 获取门店列表
- `GET /api/shops/:id` - 获取门店详情
- `POST /api/shops/` - 创建门店
- `PUT /api/shops/:id` - 更新门店
- `DELETE /api/shops/:id` - 删除门店

### 工单
- `GET /api/work-orders/` - 获取工单列表
- `GET /api/work-orders/:id` - 获取工单详情
- `POST /api/work-orders/` - 创建工单
- `PUT /api/work-orders/:id` - 更新工单
- `DELETE /api/work-orders/:id` - 删除工单
- `GET /api/work-orders/:id/comments` - 获取评论
- `POST /api/work-orders/:id/comments` - 添加评论
- `GET /api/work-orders/statistics` - 获取统计数据

### 字典
- `GET /api/work-orders/dict/types` - 获取任务类型
- `GET /api/work-orders/dict/priorities` - 获取优先级
- `GET /api/work-orders/dict/statuses` - 获取状态

## 🔐 权限说明

- 只有 **管理员 (admin)** 可以登录管理后台
- 所有功能都需要登录后才能访问
- Token 过期会自动跳转登录页

## 🎯 后续优化建议

1. ✨ 添加数据导出功能（Excel）
2. 📊 添加更多数据可视化图表（ECharts）
3. 🔍 添加高级搜索和筛选
4. 📱 优化移动端响应式布局
5. 🌙 添加深色模式
6. 🔔 添加实时通知功能
7. 📸 添加图片上传和预览
8. 🗂️ 添加文件附件管理
9. 👤 添加用户个人资料页面
10. 📈 添加业务数据分析报表

## 📄 License

MIT
