# 🔧 iOS 网络连接问题排查指南

## 📋 问题症状

在iOS设备/模拟器上登录时显示：**"网络错误，请稍后重试"**

---

## 🔍 排查步骤

### 步骤1：查看详细错误日志

我已经在代码中添加了详细的调试日志。请按以下步骤查看：

1. **在Xcode中运行应用**
2. **打开Xcode底部的Console（控制台）**
3. **尝试登录**
4. **查看Console中的输出**

你应该看到类似这样的日志：

```
========================================
🔐 Login Request
Environment: 开发环境 / 生产环境
API URL: http://192.168.31.164:5000 或 http://118.89.73.199:5000
Login Endpoint: /api/users/login
Full URL: http://xxx.xxx.xxx.xxx:5000/api/users/login
========================================
```

如果登录失败，会显示：

```
========================================
❌ Login Error
Error Type: DioException
Dio Error Type: connectionError
Error Message: ...
⚠️ Connection error - cannot reach server
Possible reasons:
  1. Server is down
  2. Wrong IP/Port
  3. Firewall blocking
  4. iOS Info.plist missing HTTP exception
========================================
```

---

### 步骤2：根据错误类型诊断

#### 🔴 错误类型1：`connectionError` - 无法连接到服务器

**可能原因：**

##### A. 开发环境 vs 生产环境问题

**检查当前环境：**
- Debug模式（`flutter run`）→ 使用开发环境API
- Release模式（`flutter build`）→ 使用生产环境API

**开发环境配置**（`environment.dart` 第41行）：
```dart
static const String developmentApiUrl = 'http://192.168.31.164:5000';
```

**生产环境配置**（第44行）：
```dart
static const String productionApiUrl = 'http://118.89.73.199:5000';
```

**解决方案：**

如果你在iOS模拟器或真机上调试：
1. 确认你的电脑IP是否是 `192.168.31.164`
2. 确认手机/模拟器和电脑在**同一个Wi-Fi网络**
3. 如果IP变了，需要修改 `developmentApiUrl`

**如何查看你的电脑IP？**

Windows PowerShell:
```powershell
ipconfig | findstr IPv4
```

Mac/Linux:
```bash
ifconfig | grep "inet "
```

**如果IP不对，修改配置：**

```dart
// frontend/lib/core/config/environment.dart
static const String developmentApiUrl = 'http://你的新IP:5000';
```

##### B. iOS Info.plist HTTP权限问题

**检查文件**：`frontend/ios/Runner/Info.plist`

**当前配置应该包含**（第70-84行）：
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>118.89.73.199</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

**问题：**
- 如果你在**开发环境**调试，但Info.plist只配置了生产服务器IP
- iOS会阻止访问开发环境的HTTP请求

**解决方案：**

添加开发环境IP到Info.plist：

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <!-- 生产环境 -->
        <key>118.89.73.199</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
        <!-- 开发环境 - 添加你的电脑IP -->
        <key>192.168.31.164</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

**或者临时使用（仅开发时）：**

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>  <!-- 允许所有HTTP请求 - 仅用于开发！ -->
</dict>
```

⚠️ **注意**：`NSAllowsArbitraryLoads = true` 仅用于开发测试，上架App Store前必须改为 `false` 并明确指定域名！

##### C. 网络权限问题

确保Info.plist中有网络权限说明（第66-67行）：

```xml
<key>NSLocalNetworkUsageDescription</key>
<string>应用需要访问网络以同步店务数据和培训内容</string>
```

##### D. 防火墙问题

**Windows防火墙可能阻止了5000端口**

测试方法：
```powershell
# 在电脑上测试后端是否运行
curl http://localhost:5000/health

# 或在浏览器访问
http://localhost:5000/health
```

如果本地能访问但iOS不能，可能是防火墙问题。

**临时关闭防火墙测试**：
1. Windows安全中心 → 防火墙和网络保护
2. 临时关闭"私有网络"防火墙
3. 测试iOS是否能连接
4. 测试后记得重新开启！

或者**添加防火墙规则**：
```powershell
# 以管理员身份运行PowerShell
New-NetFirewallRule -DisplayName "Flask Dev Server" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

#### 🟡 错误类型2：`connectionTimeout` - 连接超时

**原因**：服务器没有响应

**检查**：
1. 后端服务是否运行？
2. 端口是否正确？
3. 网络是否稳定？

#### 🟡 错误类型3：`badResponse` - 服务器返回错误

**原因**：服务器返回了4xx或5xx错误

**检查**：
1. 查看 Status Code
2. 查看 Response 内容
3. 可能是用户名密码错误，或API接口有问题

---

### 步骤3：快速测试方案

#### 方案A：使用生产环境测试

**强制使用生产环境API**（即使在Debug模式）：

```dart
// frontend/lib/main.dart
void main() {
  // 强制使用生产环境（测试用）
  EnvironmentConfig.forceEnvironment(Environment.production);
  
  EnvironmentConfig.printEnvironmentInfo();
  runApp(const SunpizzaApp());
}
```

这样即使是 `flutter run`，也会连接到生产服务器 `118.89.73.199:5000`。

#### 方案B：允许所有HTTP请求（仅测试用）

```xml
<!-- frontend/ios/Runner/Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

⚠️ 测试完成后记得改回来！

---

## ✅ 完整检查清单

### 基础检查
- [ ] 后端服务器正在运行（`118.89.73.199:5000` 或本地）
- [ ] 能在浏览器访问 `http://118.89.73.199:5000/health`
- [ ] Xcode Console中能看到详细日志

### 开发环境检查（flutter run）
- [ ] 电脑和iOS设备/模拟器在同一Wi-Fi
- [ ] `developmentApiUrl` 中的IP是你当前电脑IP
- [ ] Info.plist 中添加了开发IP的HTTP例外
- [ ] 防火墙允许5000端口

### 生产环境检查（flutter build）
- [ ] `productionApiUrl` 配置为 `http://118.89.73.199:5000`
- [ ] Info.plist 中配置了 `118.89.73.199` 的HTTP例外
- [ ] 能在浏览器访问生产服务器

### iOS特定检查
- [ ] Info.plist 包含 NSAppTransportSecurity 配置
- [ ] Info.plist 包含 NSLocalNetworkUsageDescription
- [ ] 相机、相册等权限已配置（登录不需要，但后续功能需要）

---

## 🎯 推荐的开发配置

### 配置1：开发时使用（flutter run）

**environment.dart**:
```dart
static const String developmentApiUrl = 'http://你的电脑IP:5000';
```

**Info.plist**:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>  <!-- 开发时允许所有HTTP -->
</dict>
```

### 配置2：发布前使用（flutter build ios）

**确认 environment.dart**:
```dart
static const String productionApiUrl = 'http://118.89.73.199:5000';
```

**修改 Info.plist**:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>118.89.73.199</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

---

## 🔄 修改后的操作

每次修改配置文件后：

```bash
# 1. 清理构建
flutter clean

# 2. 重新获取依赖
flutter pub get

# 3. 重新运行
flutter run

# 或在Xcode中：Product → Clean Build Folder (Cmd+Shift+K)
```

---

## 📞 还是不行？

如果按照上述步骤还是无法连接，请提供以下信息：

1. **Xcode Console的完整错误日志**（特别是Login Error部分）
2. **当前运行环境**：开发环境还是生产环境
3. **设备类型**：iOS模拟器还是真机
4. **网络情况**：设备和电脑是否在同一网络
5. **Info.plist的NSAppTransportSecurity配置**

---

**创建日期**：2024年10月16日  
**版本**：v1.0

