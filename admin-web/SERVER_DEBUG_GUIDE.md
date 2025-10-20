# 前端服务器调试指南 - 118.25.70.79

## 第1步：检查 nginx 配置

```bash
# 1. 查看 nginx 配置文件
sudo cat /etc/nginx/sites-enabled/default

# 或者
sudo cat /etc/nginx/nginx.conf

# 重点查看 root 指向哪里
# 应该是: root /var/www/html;
```

**检查要点：**
- `root` 是否指向 `/var/www/html`
- `index` 是否包含 `index.html`
- 是否有缓存配置

---

## 第2步：检查实际部署目录

```bash
# 2. 查看文件列表和时间戳
ls -lah /var/www/html/

# 3. 查看 index.html 是否存在
cat /var/www/html/index.html | head -20

# 4. 查看文件权限
ls -la /var/www/html/index.html

# 权限应该是: -rwxr-xr-x (755)
# 所有者应该是: www-data:www-data
```

---

## 第3步：检查构建文件内容

```bash
# 5. 在本地检查构建文件是否包含新代码
# 在你的本地电脑（Windows）上运行：

# PowerShell:
Select-String -Path "admin-web\dist\assets\*.js" -Pattern "getFansData" | Select-Object -First 5
Select-String -Path "admin-web\dist\assets\*.js" -Pattern "粉丝群数据" | Select-Object -First 5

# 如果没有找到，说明构建有问题！
```

---

## 第4步：手动部署（最可靠的方法）

```bash
# 6. 在服务器上手动操作

# 登录服务器
ssh ubuntu@118.25.70.79

# 备份当前文件
sudo cp -r /var/www/html /var/www/html.backup.$(date +%Y%m%d_%H%M%S)

# 删除旧文件
sudo rm -rf /var/www/html/*

# 确认已删除
ls -la /var/www/html/

# 解压新文件（确保 dist.zip 已上传）
cd ~
unzip -l dist.zip | head -20   # 查看 zip 内容
rm -rf dist_temp
unzip -q dist.zip -d dist_temp

# 查看解压后的文件
ls -la dist_temp/

# 复制到 /var/www/html
sudo cp -r dist_temp/* /var/www/html/

# 设置权限
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# 清理
rm -rf dist_temp

# 验证
ls -lah /var/www/html/
```

---

## 第5步：检查 nginx 和重启

```bash
# 7. 测试 nginx 配置
sudo nginx -t

# 8. 重启 nginx（清除所有缓存）
sudo systemctl restart nginx

# 或者
sudo service nginx restart

# 9. 查看 nginx 状态
sudo systemctl status nginx
```

---

## 第6步：检查 JS 文件是否包含新代码

```bash
# 10. 在服务器上搜索关键字
grep -r "getFansData" /var/www/html/assets/*.js
grep -r "粉丝群数据" /var/www/html/assets/*.js

# 或者查看所有 JS 文件
ls -lh /var/www/html/assets/*.js

# 找到最大的 JS 文件（通常是 main.xxx.js）
# 然后搜索
cat /var/www/html/assets/main.*.js | grep -o "getFansData" | wc -l
cat /var/www/html/assets/main.*.js | grep -o "粉丝群" | wc -l
```

**如果找不到关键字，说明：**
- 构建时没有包含新代码
- 需要重新构建：`npm run build`

---

## 第7步：本地重新构建（如果服务器文件正确）

```powershell
# 在本地 Windows 上运行：

cd admin-web

# 删除旧的构建
Remove-Item -Recurse -Force dist
Remove-Item -Force dist.zip

# 重新构建
npm run build

# 检查构建结果
Get-ChildItem dist

# 搜索关键字（确认新代码已包含）
Select-String -Path "dist\assets\*.js" -Pattern "getFansData"
Select-String -Path "dist\assets\*.js" -Pattern "粉丝群"

# 如果找到了，重新压缩并上传
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
scp dist.zip ubuntu@118.25.70.79:~/
```

---

## 第8步：浏览器缓存（终极方案）

```bash
# 如果文件确实更新了，但浏览器还是看不到

1. 完全清除浏览器缓存
   - Chrome: Ctrl+Shift+Delete → 选择"全部时间" → 勾选"缓存的图片和文件"

2. 使用无痕模式
   - Ctrl+Shift+N (Chrome)
   - Ctrl+Shift+P (Firefox)

3. 使用其他浏览器测试

4. 在开发者工具(F12) → Network 标签
   - 勾选 "Disable cache"
   - 刷新页面
   - 查看加载的 JS 文件是否是最新的（看文件大小和时间）
```

---

## 快速检查命令集合

```bash
# 一键检查（在服务器上运行）
echo "=== Nginx Root ==="
grep "root" /etc/nginx/sites-enabled/default | grep -v "#"

echo -e "\n=== Files in /var/www/html ==="
ls -lh /var/www/html/ | head -10

echo -e "\n=== index.html exists? ==="
ls -la /var/www/html/index.html

echo -e "\n=== Search for getFansData ==="
grep -r "getFansData" /var/www/html/assets/*.js | head -5

echo -e "\n=== Search for 粉丝群 ==="
grep -r "粉丝群" /var/www/html/assets/*.js | head -5

echo -e "\n=== Nginx status ==="
sudo systemctl status nginx | grep Active
```

---

## 常见问题排查

### 问题1: nginx 指向了错误的目录
**解决方法:** 修改 `/etc/nginx/sites-enabled/default`，确保 `root /var/www/html;`

### 问题2: 权限问题 (403 Forbidden)
**解决方法:**
```bash
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### 问题3: 构建文件没有包含新代码
**解决方法:** 本地重新运行 `npm run build`，然后检查 `dist/assets/*.js` 是否包含关键字

### 问题4: 浏览器强缓存
**解决方法:** 
- Ctrl+Shift+R 硬刷新
- 无痕模式
- 清除所有浏览器数据

---

## 最简单的验证方法

在浏览器中访问：
```
http://118.25.70.79/assets/index-[hash].js
```

按 Ctrl+F 搜索 "getFansData" 或 "粉丝群"，如果找不到，说明文件确实没更新！

