# 🚀 WhatsApp 推送快速测试指南

## ⚡ 3 分钟快速测试

### 步骤 1: 打开测试页面 (30秒)

```
http://localhost:8080/test-whatsapp-simple.html
```

### 步骤 2: 输入测试参数 (30秒)

- **手机号**: 输入真实的 WhatsApp 号码
  - 格式: `31612345678` (国家码+号码，无+号)
  - 多个号码: `31612345678, 31687654321` (逗号分隔)

- **测试消息**: 保持默认或自定义
  - 默认: `🧪 测试消息 from Sanjou`

### 步骤 3: 点击测试按钮 (2分钟)

1. **点击 "检查服务器状态"**
   - ✅ 应显示: `服务器在线且已连接`
   - ❌ 如果离线: 联系系统管理员

2. **点击 "测试本地发送"**
   - ✅ 应显示: `本地发送成功`
   - 📱 检查手机是否收到消息

3. **点击 "测试云端发送"**
   - ✅ 应显示: `云端发送成功`
   - 📱 检查手机是否收到消息

---

## ✅ 成功标准

### 页面显示

```json
✅ 本地发送成功！

{
  "success": true,
  "results": [
    {
      "to": "31612345678",
      "success": true,
      "error": null
    }
  ]
}
```

### 手机收到消息

```
🧪 测试消息 from Sanjou
```

---

## 🔧 如果测试失败

### 问题 1: 服务器显示离线

**解决方案**:
```bash
# 手动测试服务器
curl https://whatsapp.cislink.nl/status

# 期望输出
{"state": "CONNECTED"}
```

如果返回其他状态，联系系统管理员检查 WhatsApp 机器人。

---

### 问题 2: 发送失败，显示错误

**检查手机号格式**:

✅ 正确:
```
31612345678
```

❌ 错误:
```
+31612345678    // 不要加 +
06 1234 5678    // 不要加空格
31-6-12345678   // 不要加连字符
```

---

### 问题 3: 发送成功但手机未收到

**可能原因**:
1. 手机号未添加发送者为联系人
2. WhatsApp 服务器延迟
3. 手机号未激活 WhatsApp

**解决方案**:
1. 将发送者号码添加到手机联系人
2. 等待 1-2 分钟
3. 使用其他号码测试

---

## 🧪 完整订单流程测试

### 前提条件

确保 Firebase 配置正确：

```json
/Sanjou/config
{
  "whatsappBerichtAan": true,
  "whatsappRecipients": ["31612345678", "31687654321"],
  "WebHook": "https://your-webhook-url.com"
}
```

### 测试步骤

1. **访问订单页面**:
   ```
   http://localhost:8080/?rest=Sanjou&tafel=1
   ```

2. **添加菜品到购物车**:
   - 选择任意菜品
   - 点击 "添加"

3. **确认订单**:
   - 点击 "查看购物车"
   - 点击 "确认订单"

4. **验证通知**:
   - 打开浏览器控制台 (F12)
   - 查找日志:
     ```
     ✅ WhatsApp 发送成功到 31612345678
     ```
   - 检查手机是否收到订单通知

### 期望收到的消息格式

```
📩 Nieuwe bestelling (*Tafel 1*, *#1234*)

▶ 2x Spring Roll (€6.50)
▶ 1x Peking Duck (€18.50)

🧾 Totaal items: 2
💰 *Totaal bedrag: €25.00*
```

---

## 📋 Firebase 配置检查

### 快速检查命令

**在浏览器控制台执行** (F12 → Console):

```javascript
// 1. 检查配置是否加载
console.log("配置状态:", AppConfig.configReady);
console.log("通知开关:", AppConfig.whatsappBerichtAan);
console.log("接收人:", AppConfig.whatsappPhone);

// 2. 手动发送测试
const result = await window.sendOrderViaLocalWWeb(
  ["31612345678"],
  "手动测试消息"
);
console.log(result);
```

---

## 🎯 检查清单

在报告问题前，请确认：

- [ ] 服务器状态显示 `CONNECTED`
- [ ] 手机号格式正确 (无 +、空格、连字符)
- [ ] Firebase 中 `whatsappBerichtAan = true` (布尔值，不是字符串)
- [ ] Firebase 中 `whatsappRecipients` 包含至少一个号码
- [ ] 测试页面发送成功
- [ ] 浏览器控制台无错误日志
- [ ] 已清除浏览器缓存 (Ctrl + Shift + Delete)

---

## 🆘 获取帮助

如果所有测试都失败，请提供：

1. **服务器状态输出**:
   ```bash
   curl https://whatsapp.cislink.nl/status
   ```

2. **测试页面截图** (包含完整结果)

3. **浏览器控制台日志** (F12 → Console)

4. **Firebase 配置截图** (`/Sanjou/config`)

5. **测试手机号** (用于验证)

---

## 📞 联系方式

- **技术支持**: 系统管理员
- **文档**: [WHATSAPP_TROUBLESHOOTING.md](WHATSAPP_TROUBLESHOOTING.md)
- **修复总结**: [WHATSAPP_FIX_SUMMARY.md](WHATSAPP_FIX_SUMMARY.md)

---

*最后更新: 2025-11-06*
*预计测试时间: 3 分钟*
