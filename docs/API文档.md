# 圣比萨智能门店管理平台 - API接口文档

## 基础信息

- **Base URL**: `http://localhost:5000`
- **认证方式**: JWT Bearer Token
- **响应格式**: JSON

## 认证说明

除了登录接口外，所有接口都需要在请求头中携带Token：

```
Authorization: Bearer <your_token>
```

---

## 1. 用户管理模块

### 1.1 用户登录

**接口**: `POST /api/users/login`

**请求参数**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "real_name": "系统管理员",
      "role": "admin",
      "shop_id": null,
      "shop_name": null,
      "created_at": "2025-10-06T10:00:00"
    }
  }
}
```

### 1.2 注册新用户

**接口**: `POST /api/users/register`

**权限**: 仅管理员

**请求参数**:
```json
{
  "username": "newuser",
  "password": "password123",
  "real_name": "新用户",
  "role": "shop_manager",
  "shop_id": 1
}
```

**角色选项**:
- `admin` - 管理员
- `regional_manager` - 区域经理
- `shop_manager` - 店长

### 1.3 获取用户列表

**接口**: `GET /api/users/`

**查询参数**:
- `page` (int): 页码，默认1
- `per_page` (int): 每页数量，默认20
- `role` (string): 按角色筛选
- `shop_id` (int): 按门店筛选

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取用户列表成功",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### 1.4 获取用户详情

**接口**: `GET /api/users/{user_id}`

### 1.5 更新用户信息

**接口**: `PUT /api/users/{user_id}`

**权限**: 仅管理员

**请求参数**:
```json
{
  "real_name": "更新后的姓名",
  "role": "regional_manager",
  "shop_id": 2,
  "password": "new_password"
}
```

### 1.6 删除用户

**接口**: `DELETE /api/users/{user_id}`

**权限**: 仅管理员

---

## 2. 门店管理模块

### 2.1 获取门店列表

**接口**: `GET /api/shops/`

**查询参数**:
- `page` (int): 页码
- `per_page` (int): 每页数量
- `regional_manager_id` (int): 按区域经理筛选

**权限说明**:
- 管理员可查看所有门店
- 区域经理只能查看自己管辖的门店

### 2.2 获取门店详情

**接口**: `GET /api/shops/{shop_id}`

### 2.3 创建门店

**接口**: `POST /api/shops/`

**权限**: 仅管理员

**请求参数**:
```json
{
  "name": "圣比萨-新门店",
  "address": "北京市朝阳区某某街道",
  "regional_manager_id": 2
}
```

### 2.4 更新门店信息

**接口**: `PUT /api/shops/{shop_id}`

**权限**: 仅管理员

### 2.5 删除门店

**接口**: `DELETE /api/shops/{shop_id}`

**权限**: 仅管理员

---

## 3. 工单任务模块

### 3.1 获取工单列表

**接口**: `GET /api/work-orders/`

**查询参数**:
- `page` (int): 页码
- `per_page` (int): 每页数量
- `status_id` (int): 按状态筛选
- `type_id` (int): 按类型筛选
- `priority_id` (int): 按优先级筛选
- `shop_id` (int): 按门店筛选
- `assignee_id` (int): 按执行人筛选
- `creator_id` (int): 按创建人筛选

**权限说明**:
- 管理员可查看所有工单
- 区域经理可查看管辖门店的工单
- 店长只能查看自己创建或分配给自己的工单

### 3.2 获取工单详情

**接口**: `GET /api/work-orders/{work_order_id}`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取工单详情成功",
  "data": {
    "id": 1,
    "title": "设备报修",
    "description": "冰箱不制冷需要维修",
    "type": {
      "id": 3,
      "type_name": "设备报修",
      "color": "#45B7D1"
    },
    "priority": {
      "id": 3,
      "priority_name": "高",
      "color": "#EC7063",
      "sort_order": 3
    },
    "status": {
      "id": 2,
      "status_name": "进行中",
      "color": "#3498DB"
    },
    "creator": {
      "id": 3,
      "real_name": "李店长"
    },
    "assignee": {
      "id": 2,
      "real_name": "张经理"
    },
    "shop": {...},
    "due_date": "2025-10-08T18:00:00",
    "completion_progress": 50,
    "completion_notes": null,
    "created_at": "2025-10-06T10:00:00",
    "updated_at": "2025-10-06T15:30:00",
    "comments": [...],
    "attachments": [...]
  }
}
```

### 3.3 创建工单

**接口**: `POST /api/work-orders/`

**请求参数**:
```json
{
  "title": "营销活动执行",
  "description": "双十一促销活动准备",
  "type_id": 2,
  "priority_id": 2,
  "assignee_id": 3,
  "shop_id": 1,
  "due_date": "2025-11-11T23:59:59"
}
```

**字段说明**:
- `type_id`: 任务类型ID（1-稽查整改, 2-营销活动, 3-设备报修, 4-物料申请, 5-人员调度, 6-其他）
- `priority_id`: 优先级ID（1-低, 2-中, 3-高）
- `assignee_id`: 执行人用户ID
- `shop_id`: 关联门店ID
- `due_date`: 截止时间（ISO 8601格式）

### 3.4 更新工单

**接口**: `PUT /api/work-orders/{work_order_id}`

**请求参数**:
```json
{
  "status_id": 2,
  "completion_progress": 75,
  "completion_notes": "已完成大部分工作"
}
```

### 3.5 添加评论

**接口**: `POST /api/work-orders/{work_order_id}/comments`

**请求参数**:
```json
{
  "content": "设备已联系厂商，明天上门维修",
  "attachment_url": "https://example.com/image.jpg"
}
```

### 3.6 获取任务类型列表

**接口**: `GET /api/work-orders/dict/types`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取任务类型成功",
  "data": [
    {
      "id": 1,
      "type_name": "稽查整改",
      "color": "#FF6B6B"
    },
    ...
  ]
}
```

### 3.7 获取优先级列表

**接口**: `GET /api/work-orders/dict/priorities`

### 3.8 获取状态列表

**接口**: `GET /api/work-orders/dict/statuses`

---

## 4. 标准清洁任务模块

### 4.1 获取任务模板列表

**接口**: `GET /api/routine-tasks/templates`

**查询参数**:
- `frequency` (string): 按频率筛选（daily/weekly/monthly）

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取模板列表成功",
  "data": [
    {
      "id": 1,
      "task_name": "日常清洁检查",
      "description": "每日门店清洁标准检查",
      "frequency": "daily",
      "checklist": [
        {
          "item": "地面清洁",
          "required_photo": true
        },
        {
          "item": "桌面擦拭",
          "required_photo": false
        }
      ],
      "is_active": true,
      "created_at": "2025-10-06T10:00:00"
    }
  ]
}
```

### 4.2 创建任务模板

**接口**: `POST /api/routine-tasks/templates`

**权限**: 仅管理员

**请求参数**:
```json
{
  "task_name": "月度深度清洁",
  "description": "每月深度清洁检查",
  "frequency": "monthly",
  "checklist": [
    {
      "item": "中央空调清洗",
      "required_photo": true
    },
    {
      "item": "排水系统检查",
      "required_photo": true
    }
  ],
  "is_active": true
}
```

### 4.3 更新任务模板

**接口**: `PUT /api/routine-tasks/templates/{template_id}`

**权限**: 仅管理员

### 4.4 获取我的清洁任务

**接口**: `GET /api/routine-tasks/my-tasks`

**权限**: 仅店长

**查询参数**:
- `date` (string): 查询日期，格式：YYYY-MM-DD，默认今天

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取清洁任务成功",
  "data": [
    {
      "id": 1,
      "template": {...},
      "shop": {...},
      "due_date": "2025-10-06",
      "is_completed": false,
      "completed_at": null,
      "completed_by": null,
      "checklist_status": null
    }
  ]
}
```

### 4.5 完成清洁任务

**接口**: `POST /api/routine-tasks/{task_id}/complete`

**请求参数**:
```json
{
  "checklist_status": {
    "地面清洁": {
      "completed": true,
      "photo_url": "https://example.com/floor.jpg"
    },
    "桌面擦拭": {
      "completed": true,
      "photo_url": null
    }
  }
}
```

---

## 5. 培训系统模块

### 5.1 获取培训分类

**接口**: `GET /api/training/categories`

**查询参数**:
- `type` (string): 按类型筛选（product/service/operation）

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取分类成功",
  "data": [
    {
      "id": 1,
      "name": "产品类培训",
      "parent_id": null,
      "type": "product",
      "sort_order": 1,
      "children": [
        {
          "id": 2,
          "name": "圣比萨系列",
          "parent_id": 1,
          "type": "product",
          "sort_order": 1
        }
      ]
    }
  ]
}
```

### 5.2 获取课程列表

**接口**: `GET /api/training/courses`

**查询参数**:
- `category_id` (int): 按分类筛选

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取课程列表成功",
  "data": [
    {
      "id": 1,
      "title": "玛格丽特披萨制作规范",
      "description": "经典意式披萨制作标准流程",
      "category": {...},
      "content_type": "video",
      "content_url": "https://example.com/video.mp4",
      "content_text": null,
      "has_exam": true,
      "is_published": true,
      "created_at": "2025-10-06T10:00:00"
    }
  ]
}
```

### 5.3 获取课程详情

**接口**: `GET /api/training/courses/{course_id}`

### 5.4 开始学习课程

**接口**: `POST /api/training/courses/{course_id}/start`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "开始学习",
  "data": {
    "id": 1,
    "user_id": 3,
    "course": {...},
    "completed": false,
    "exam_score": null,
    "exam_passed": false,
    "started_at": "2025-10-06T15:00:00",
    "completed_at": null
  }
}
```

### 5.5 完成课程学习

**接口**: `POST /api/training/courses/{course_id}/complete`

### 5.6 获取我的学习记录

**接口**: `GET /api/training/my-records`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取学习记录成功",
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "course": {...},
      "completed": true,
      "exam_score": 95,
      "exam_passed": true,
      "started_at": "2025-10-05T10:00:00",
      "completed_at": "2025-10-05T11:30:00"
    }
  ]
}
```

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或token无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 附录

### 任务类型枚举

| ID | 类型名称 | 颜色 |
|----|---------|------|
| 1 | 稽查整改 | #FF6B6B |
| 2 | 营销活动 | #4ECDC4 |
| 3 | 设备报修 | #45B7D1 |
| 4 | 物料申请 | #96CEB4 |
| 5 | 人员调度 | #F7C46C |
| 6 | 其他 | #9E9E9E |

### 优先级枚举

| ID | 名称 | 颜色 | 排序 |
|----|------|------|------|
| 1 | 低 | #5DADE2 | 1 |
| 2 | 中 | #F4D03F | 2 |
| 3 | 高 | #EC7063 | 3 |

### 状态枚举

| ID | 名称 | 颜色 |
|----|------|------|
| 1 | 待受理 | #95A5A6 |
| 2 | 进行中 | #3498DB |
| 3 | 已完成 | #2ECC71 |
| 4 | 已关闭 | #7F8C8D |

### 清洁任务频率

- `daily` - 日清
- `weekly` - 周清
- `monthly` - 月清

