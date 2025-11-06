# WhatsApp 订单推送故障排除指南

## 📋 目录
1. [问题概述](#问题概述)
2. [系统架构](#系统架构)
3. [诊断步骤](#诊断步骤)
4. [常见问题及解决方案](#常见问题及解决方案)
5. [配置清单](#配置清单)
6. [测试工具](#测试工具)

---

## 问题概述

**症状**: 已设置 `whatsappBerichtAan: true`，但订单后仍未收到 WhatsApp 推送通知

**根本原因分析**:
WhatsApp 通知功能依赖多个条件同时满足，任何一个环节出问题都会导致通知失败。

---

## 系统架构

### 发送流程图

```
用户点击"确认订单"
    ↓
[1] 订单数据发送到 WebHook
    ↓ (WebHook 成功返回)
[2] 检查配置: whatsappBerichtAan === true ?
    ↓ (是)
[3] 检查配置: whatsappRecipients 是否非空 ?
    ↓ (是)
[4] 构建 WhatsApp 消息文本
    ↓
[5] 检查本地 WhatsApp 服务器在线状态
    ↓
    ├─ 本地在线 → [6A] 发送到 https://whatsapp.cislink.nl/send
    │                ↓ (成功)
    │                ✅ 完成
    │                ↓ (失败)
    └─ 本地离线 ───→ [6B] 回退到云端 Google Cloud Function
                         ↓
                         ✅ 完成
```

### 关键组件

| 组件 | 文件路径 | 功能 |
|------|---------|------|
| **配置加载器** | [public/firebase-loader.js](public/firebase-loader.js#L33-34) | 从 Firebase 加载 WhatsApp 配置 |
| **订单发送逻辑** | [public/sendingOrder.js](public/sendingOrder.js#L208-237) | 订单提交后触发通知 |
| **消息构建器** | [public/whatsapp-module.js](public/whatsapp-module.js#L28-60) | 构建消息文本 |
| **本地发送器** | [public/whatsapp-module.js](public/whatsapp-module.js#L93-126) | 调用本地 WhatsApp API |
| **云端发送器** | [public/whatsapp-module.js](public/whatsapp-module.js#L1-26) | 调用云端备份 API |
| **订单触发点** | [public/class-order-js.js](public/class-order-js.js#L927) | 订单确认入口 |

---

## 诊断步骤

### 🔍 第一步：检查 Firebase 配置

#### 方法 A：使用诊断工具 (推荐)

1. 打开浏览器访问:
   ```
   http://localhost:8080/whatsapp-diagnostic.html?rest=Sanjou&tafel=1
   ```

2. 点击 **"检查 Firebase 配置"** 按钮

3. 查看结果，确保:
   - ✅ `whatsappBerichtAan: true`
   - ✅ `whatsappRecipients: ["31612345678", ...]` (非空数组)

#### 方法 B：手动检查 Firebase 控制台

1. 访问 [Firebase 控制台](https://console.firebase.google.com/u/0/project/cislink/database/cislink-default-rtdb/data)

2. 导航到路径:
   ```
   /Sanjou/config
   ```

3. 检查字段:
   ```json
   {
     "whatsappBerichtAan": true,
     "whatsappRecipients": [
       "31612345678",
       "31687654321"
     ],
     "WebHook": "https://your-webhook-url.com",
     "restNaam": "Sanjou"
   }
   ```

#### ⚠️ 常见错误

| 错误配置 | 后果 | 正确配置 |
|---------|------|---------|
| `whatsappBerichtAan: false` | 通知被完全禁用 | `true` |
| `whatsappBerichtAan: "true"` | 字符串类型，判断失败 | 布尔值 `true` |
| `whatsappRecipients: []` | 没有接收人 | 至少一个手机号 |
| `whatsappRecipients: "31612345678"` | 字符串而非数组 | `["31612345678"]` |
| 手机号格式: `+31612345678` | 可能导致发送失败 | `31612345678` (无+号) |

---

### 🌐 第二步：检查 WhatsApp 服务器状态

#### 使用诊断工具

1. 在诊断页面点击 **"检查服务器在线状态"**

2. 期望结果:
   ```json
   {
     "state": "CONNECTED"
   }
   ```

3. 如果显示其他状态 (如 `DISCONNECTED`, `TIMEOUT`)，说明本地 WhatsApp 机器人离线

#### 手动测试

```bash
curl https://whatsapp.cislink.nl/status
```

**期望输出**:
```json
{"state": "CONNECTED"}
```

#### 解决方案

- **本地服务器离线**: 系统会自动回退到云端 Google Cloud Function，通知仍可正常工作
- **完全无法访问**: 检查网络连接或联系系统管理员

---

### 📤 第三步：测试消息发送

#### 使用诊断工具

1. 在诊断页面输入:
   - **手机号**: `31612345678` (实际接收号码)
   - **测试消息**: 任意文本

2. 点击 **"发送测试 (本地服务器)"**

3. 检查:
   - ✅ 页面显示 "发送成功"
   - ✅ 手机收到 WhatsApp 消息

#### 手动测试 (使用 curl)

```bash
curl -X POST https://whatsapp.cislink.nl/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "31612345678",
    "message": "测试消息 from Sanjou"
  }'
```

**期望输出**:
```json
{
  "success": true
}
```

---

### 🧪 第四步：模拟完整订单流程

#### 使用诊断工具 (一键测试)

1. 在诊断页面点击 **"模拟完整订单流程"**

2. 系统会自动执行:
   - ✅ 读取 Firebase 配置
   - ✅ 检查 `whatsappBerichtAan`
   - ✅ 检查 `whatsappRecipients`
   - ✅ 检查服务器状态
   - ✅ 构建订单消息
   - ✅ 发送到所有接收人

3. 查看详细报告，定位问题环节

---

## 常见问题及解决方案

### ❌ 问题 1: `whatsappBerichtAan` 已设置为 `true`，但代码仍显示 `false`

**可能原因**:
1. Firebase 配置未同步
2. 浏览器缓存了旧配置
3. 使用了错误的餐厅名称 (`restName`)

**解决方案**:
```javascript
// 在浏览器控制台执行，检查实际加载的配置
console.log(AppConfig.whatsappBerichtAan);
console.log(AppConfig.whatsappPhone);
console.log(AppConfig.configReady);
```

**排查步骤**:
1. 清除浏览器缓存 (Ctrl + Shift + Delete)
2. 硬刷新页面 (Ctrl + F5)
3. 检查 URL 参数: `?rest=Sanjou&tafel=1` (确保 `rest` 参数正确)
4. 打开浏览器开发者工具 (F12) → Console，查找错误日志

---

### ❌ 问题 2: 配置正确，但订单后没有日志

**可能原因**:
1. WebHook 失败 (WhatsApp 通知依赖 WebHook 先成功)
2. JavaScript 异常被静默捕获

**解决方案**:

1. **检查 WebHook 配置**:
   - Firebase 路径: `/Sanjou/config/WebHook`
   - 确保 URL 有效且可访问

2. **检查浏览器控制台**:
   - 打开 F12 → Console
   - 下单后查找日志:
     - `✅ WhatsApp 发送成功`
     - `❌ WhatsApp 发送失败`
     - `ℹ️ whatsappBerichtAan is false, skipping WhatsApp notification`
     - `⚠️ AppConfig.whatsappPhone 未设置，跳过 WhatsApp 通知`

3. **手动触发通知** (在控制台执行):
   ```javascript
   const testBestelling = [
     "SKU001", "Spring Roll", 2, 3.25, "无", "无", "无", "无",
     "SKU002", "Peking Duck", 1, 18.50, "无", "无", "无", "无"
   ];

   const message = window.buildWhatsAppMessageText(testBestelling, "5", "9999", 2);
   console.log(message);

   const result = await window.sendOrderViaLocalWWeb(["31612345678"], message);
   console.log(result);
   ```

---

### ❌ 问题 3: 本地服务器离线，云端也失败

**可能原因**:
1. 手机号格式错误
2. WhatsApp 账号未激活
3. 云端 API 配额耗尽

**解决方案**:

1. **验证手机号格式**:
   ```javascript
   // 正确格式
   ["31612345678", "31687654321"]

   // 错误格式 (不要使用)
   ["+31612345678"]  // ❌ 带 + 号
   ["06 1234 5678"]  // ❌ 带空格
   ["31-6-12345678"] // ❌ 带连字符
   ```

2. **测试云端 API**:
   ```bash
   curl -X POST \
     https://europe-west1-diditaxi-klantenservice.cloudfunctions.net/sendWhatsAppMessage \
     -H "Content-Type: application/json" \
     -d '{
       "recipientNumber": "31612345678",
       "messageText": "测试云端API"
     }'
   ```

3. **检查 Google Cloud Function 日志**:
   - 访问 [Google Cloud Console](https://console.cloud.google.com/functions/list?project=diditaxi-klantenservice)
   - 查看 `sendWhatsAppMessage` 函数的日志

---

### ❌ 问题 4: 收到消息但内容为空或格式错误

**可能原因**:
1. `buildWhatsAppMessageText` 函数未正确加载
2. 订单数据格式异常

**解决方案**:

1. **检查函数是否存在**:
   ```javascript
   console.log(typeof window.buildWhatsAppMessageText);
   // 应输出: "function"
   ```

2. **测试消息构建**:
   ```javascript
   const testOrder = [
     "SKU001", "Test Item", 3, 12.50, "无", "无", "无", "无"
   ];
   const message = window.buildWhatsAppMessageText(testOrder, "8", "1234", 1);
   console.log(message);
   ```

   **期望输出**:
   ```
   📩 Nieuwe bestelling (*Tafel 8*, *#1234*)

   ▶ 3x Test Item (€12.50)

   🧾 Totaal items: 1
   💰 *Totaal bedrag: €37.50*
   ```

3. **检查文件加载顺序** (在 HTML 中):
   ```html
   <script src="whatsapp-module.js"></script>  <!-- 必须先加载 -->
   <script src="sendingOrder.js"></script>
   <script src="class-order-js.js"></script>
   ```

---

### ❌ 问题 5: 只有部分接收人收到通知

**可能原因**:
1. 某些手机号格式错误
2. WhatsApp 服务器限流
3. 接收人未添加发送者为联系人

**解决方案**:

1. **逐个测试手机号**:
   - 使用诊断工具单独向每个号码发送测试消息
   - 记录哪些号码成功，哪些失败

2. **检查发送结果**:
   ```javascript
   // sendingOrder.js 会记录每个接收人的结果
   // 在浏览器控制台查找类似日志:
   // ✅ WhatsApp 发送成功到 31612345678
   // ❌ WhatsApp 发送失败到 31687654321: Invalid phone number
   ```

3. **批量发送间隔**:
   - 如果接收人超过 5 个，建议在 `whatsapp-module.js` 中添加延迟:
   ```javascript
   for (const phone of phones) {
     // ... 发送逻辑 ...
     await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒延迟
   }
   ```

---

## 配置清单

### ✅ Firebase 必需配置

**路径**: `/Sanjou/config`

| 字段 | 类型 | 必需 | 示例值 | 说明 |
|------|------|------|--------|------|
| `whatsappBerichtAan` | Boolean | ✅ | `true` | 通知总开关 |
| `whatsappRecipients` | Array | ✅ | `["31612345678"]` | 接收人手机号数组 (国家码+号码) |
| `WebHook` | String | ✅ | `"https://example.com/webhook"` | 订单推送 URL (必须先成功) |
| `restNaam` | String | ⚠️ | `"Sanjou"` | 餐厅名称 |
| `WebHookStatus` | String | ⚠️ | `"https://example.com/status"` | WebHook 健康检查 URL |

### ✅ 代码文件清单

| 文件 | 必需 | 说明 |
|------|------|------|
| `public/firebase-loader.js` | ✅ | 加载 Firebase 配置到 `AppConfig` |
| `public/whatsapp-module.js` | ✅ | WhatsApp 发送函数 |
| `public/sendingOrder.js` | ✅ | 订单提交和通知触发逻辑 |
| `public/class-order-js.js` | ✅ | Order 类，订单确认入口 |

### ✅ HTML 加载顺序

```html
<!-- 必须按此顺序加载 -->
<script src="https://www.gstatic.com/firebasejs/9.17.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.17.2/firebase-database-compat.js"></script>
<script src="firebase-loader.js"></script>
<script src="whatsapp-module.js"></script>
<script src="sendingOrder.js"></script>
<script src="class-order-js.js"></script>
```

---

## 测试工具

### 🛠️ 工具 1: WhatsApp 诊断页面

**文件**: `public/whatsapp-diagnostic.html`

**访问方式**:
```
http://localhost:8080/whatsapp-diagnostic.html?rest=Sanjou&tafel=1
```

**功能**:
- ✅ 检查 Firebase 配置
- ✅ 检查 WhatsApp 服务器状态
- ✅ 测试消息发送 (本地 + 云端)
- ✅ 模拟完整订单流程
- ✅ 实时日志监控

---

### 🛠️ 工具 2: 配置修复脚本

**文件**: `fix-whatsapp-config.js`

**使用方式**:
```bash
# 1. 安装 Firebase Admin SDK (如果未安装)
npm install firebase-admin

# 2. 运行脚本
node fix-whatsapp-config.js

# 3. 按照提示操作:
#    - 输入 Firebase 服务账号 JSON 路径
#    - 输入餐厅名称
#    - 输入接收人手机号
```

**功能**:
- ✅ 自动诊断配置问题
- ✅ 交互式修复配置
- ✅ 直接写入 Firebase
- ✅ 提供手动配置指南

---

### 🛠️ 工具 3: 浏览器控制台命令

#### 检查当前配置
```javascript
console.log("配置状态:", AppConfig.configReady);
console.log("通知开关:", AppConfig.whatsappBerichtAan);
console.log("接收人:", AppConfig.whatsappPhone);
console.log("WebHook:", AppConfig.WebHook);
```

#### 手动发送测试消息
```javascript
// 测试本地服务器
const result = await window.sendOrderViaLocalWWeb(
  ["31612345678"],
  "测试消息 from 控制台"
);
console.log(result);
```

#### 测试消息构建
```javascript
const testOrder = ["SKU", "Item Name", 2, 10.00, "", "", "", ""];
const message = window.buildWhatsAppMessageText(testOrder, "5", "1234", 1);
console.log(message);
```

---

## 🔗 相关资源

- **Firebase 控制台**: https://console.firebase.google.com/u/0/project/cislink/database
- **本地 WhatsApp API**: https://whatsapp.cislink.nl
- **云端备份 API**: https://europe-west1-diditaxi-klantenservice.cloudfunctions.net/sendWhatsAppMessage
- **参考项目**: https://github.com/CislinkNL/AsianBoulevard-New_App

---

## 📞 获取帮助

如果以上步骤仍无法解决问题，请收集以下信息:

1. **诊断工具截图** (完整的 "模拟完整订单流程" 结果)
2. **浏览器控制台日志** (F12 → Console，下单前后的所有输出)
3. **Firebase 配置截图** (`/Sanjou/config` 节点)
4. **实际接收人手机号** (用于测试)
5. **WebHook URL** (用于检查服务器连接)

---

## 🎯 快速检查清单

**在报告问题前，请确认以下所有项目:**

- [ ] Firebase 中 `whatsappBerichtAan` 为布尔值 `true` (不是字符串 `"true"`)
- [ ] `whatsappRecipients` 是数组且至少包含一个手机号
- [ ] 手机号格式正确 (例: `31612345678`，无 + 号、空格、连字符)
- [ ] 浏览器 URL 包含正确的 `?rest=Sanjou&tafel=X` 参数
- [ ] 已清除浏览器缓存并硬刷新 (Ctrl + F5)
- [ ] WebHook 配置正确且可访问
- [ ] 使用诊断工具测试，所有步骤都通过
- [ ] 浏览器控制台没有 JavaScript 错误
- [ ] 本地或云端 API 至少有一个可用

**如果以上所有项目都正常，但仍未收到通知，请联系技术支持。**

---

*最后更新: 2025-11-06*
*适用版本: Sanjou-New_App v1.0*
