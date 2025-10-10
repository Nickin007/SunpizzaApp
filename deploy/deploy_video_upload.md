# 📹 视频上传功能部署指南

## 🎯 功能说明

现在培训课程支持**直接上传视频文件**，无需手动输入URL！

### ✅ 支持的方式
1. **文件上传**（推荐）：点击"选择并上传视频文件"按钮，选择本地视频
2. **URL输入**（兼容）：仍然支持手动输入视频URL

---

## 🚀 部署步骤

### 1️⃣ 上传后端文件

```powershell
# 上传新增的上传API
scp backend/app/api/upload.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/api/

# 上传修改的 __init__.py
scp backend/app/__init__.py ubuntu@118.89.73.199:~/SunpizzaApp/backend/app/
```

### 2️⃣ 在服务器上创建上传目录

```powershell
ssh ubuntu@118.89.73.199 "mkdir -p ~/SunpizzaApp/backend/uploads/videos"
ssh ubuntu@118.89.73.199 "mkdir -p ~/SunpizzaApp/backend/uploads/images"
ssh ubuntu@118.89.73.199 "mkdir -p ~/SunpizzaApp/backend/uploads/documents"
```

### 3️⃣ 重启后端服务

```powershell
ssh ubuntu@118.89.73.199 "sudo systemctl restart sunpizza-backend"
```

### 4️⃣ 检查服务状态

```powershell
ssh ubuntu@118.89.73.199 "sudo systemctl status sunpizza-backend --no-pager"
```

### 5️⃣ 构建并部署前端

```powershell
cd admin-web
npm run build
scp -r dist/* ubuntu@118.89.73.199:~/SunpizzaApp/admin-web/dist/
```

---

## 📝 使用说明

### 在Web管理端创建课程时：

1. **方式1：上传视频文件**
   - 点击"选择并上传视频文件"按钮
   - 选择本地视频文件（最大500MB）
   - 等待上传完成（显示进度条）
   - 系统自动填充视频URL

2. **方式2：手动输入URL**（适合使用第三方视频服务）
   - 在输入框直接输入视频URL
   - 例如：`https://example.com/video.mp4`

### 支持的视频格式
- MP4（推荐）
- AVI
- MOV
- MKV
- FLV
- WMV
- WebM

### 文件大小限制
- 单个视频最大：**500MB**
- 图片最大：**10MB**
- 文档最大：**50MB**

---

## 🎬 上传流程

```
1. 管理员点击"新增课程"
2. 填写课程标题、描述、分类
3. 点击"选择并上传视频文件"
4. 选择本地视频 → 上传开始
5. 显示上传进度（0% - 100%）
6. 上传成功，URL自动填充到输入框
7. 填写文档内容、设置考试
8. 点击"确定"保存课程
9. APP端可以观看视频
```

---

## 📂 文件存储结构

```
backend/
└── uploads/
    ├── videos/          # 视频文件
    │   └── abc123_20251010120000.mp4
    ├── images/          # 图片文件
    │   └── def456_20251010120000.jpg
    └── documents/       # 文档文件
        └── ghi789_20251010120000.pdf
```

### 访问URL
- 视频：`http://118.89.73.199:5000/uploads/videos/文件名.mp4`
- 图片：`http://118.89.73.199:5000/uploads/images/文件名.jpg`
- 文档：`http://118.89.73.199:5000/uploads/documents/文件名.pdf`

---

## 🔒 安全特性

1. ✅ **文件类型校验**：只允许特定格式
2. ✅ **文件大小限制**：防止超大文件
3. ✅ **权限验证**：仅管理员可上传
4. ✅ **唯一文件名**：使用UUID + 时间戳，防止冲突
5. ✅ **文件名安全**：使用 `secure_filename` 处理

---

## 🧪 测试步骤

### 1. 测试视频上传
```
1. 登录Web管理端
2. 进入"培训课程管理"
3. 点击"新增课程"
4. 点击"选择并上传视频文件"
5. 选择一个MP4文件（小于500MB）
6. 观察上传进度
7. 上传成功后检查URL是否自动填充
8. 保存课程
9. 在APP端查看是否能播放
```

### 2. 测试大文件限制
```
1. 尝试上传超过500MB的视频
2. 应该显示"文件大小超过限制"错误
```

### 3. 测试格式限制
```
1. 尝试上传.txt或.zip文件
2. 应该显示"不支持的文件格式"错误
```

---

## ⚠️ 注意事项

1. **磁盘空间**：确保服务器有足够空间存储视频
2. **上传速度**：大文件上传时间较长，请耐心等待
3. **网络稳定**：上传过程中保持网络连接
4. **备份建议**：定期备份 `uploads/` 目录

---

## 🆘 常见问题

### Q1: 上传失败怎么办？
A: 检查：
- 文件大小是否超过500MB
- 文件格式是否支持
- 网络连接是否稳定
- 服务器磁盘空间是否充足

### Q2: 视频在APP端无法播放？
A: 检查：
- 视频格式（推荐使用MP4）
- 视频编码（推荐H.264）
- APP端的网络连接
- 视频URL是否正确

### Q3: 如何删除已上传的视频？
A: 可以通过SSH登录服务器，手动删除 `uploads/videos/` 目录下的文件

### Q4: 可以使用第三方视频服务吗？
A: 可以！直接在输入框输入第三方视频URL即可，例如：
- YouTube
- 优酷
- 腾讯视频
- 阿里云OSS
- 七牛云等

---

## 🎉 完成！

现在可以方便地上传视频了，不再需要手动输入URL！

