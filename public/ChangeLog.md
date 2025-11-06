# Asian Boulevard 变更日志

## 2025-08-19

- 优化菜单显示：菜单项现在显示 displayName（编号+名称），而不是只显示名称。
- 相关文件：public/script-js.js
- 说明：用户界面菜单项已更新，便于顾客更清晰地识别菜品。

## 变更日志（ChangeLog.md）

## 2025-08-19 (配置与功能更新)

### [firebase-loader.js]

- 新增：支持 AppConfig.translateOn 配置项，控制是否启用谷歌翻译脚本。
- 目的：允许通过 Firebase 配置动态开关页面自动翻译功能，满足不同餐厅/场景需求，提升灵活性。

### [index.html]

- 新增：为谷歌翻译脚本添加 id="google-translate-script"，便于动态移除。
- 目的：配合 JS 逻辑实现前端动态控制谷歌翻译脚本的加载与否。

## 项目主要配置项说明（摘自 Firebase config）

- restName：餐厅标识（字符串，必需）
- tafelRaw：桌号原始参数（字符串，必需）
- tafelId：桌号（如 Tafel-1），由 tafelRaw 生成
- pincode：桌面 PIN 码（字符串，可选）
- whatsappRecipients：WhatsApp 通知接收人（数组，可选）
- whatsappBerichtAan：是否启用 WhatsApp 通知（布尔，true/false）
- pythonAuth：后端认证 URL（字符串，可选）
- restNaam：餐厅显示名称（字符串，可选）
- restUrlName：餐厅 URL 名称（字符串，可选）
- titleImage：LOGO 图片 URL（字符串，可选）
- server_access：服务端密钥（字符串，可选）
- timeLimit：是否启用下单时间限制（布尔，默认 true）
- etenLimiet/dessertLimiet：菜品/甜品限额（数字，可选）
- url2：备用刷新 URL（字符串，可选）
- WebHook/WebHookStatus：订单 WebHook 地址及健康检查（字符串，可选）
- maxTijd/eerste_ronde_tijd：最大用餐/首轮时间（数字，可选）
- savedPincode：保存的 PIN 码（字符串，可选）
- translateOn：是否启用谷歌翻译（布尔，true/false，默认 true）

> 说明：所有配置均从 Firebase Realtime Database 的 /{restName}/config 路径读取。
>
> translateOn=false 时，页面不会加载谷歌翻译脚本。
> whatsappBerichtAan=false 时，订单不会发送 WhatsApp 通知。

## 数据库 config 节点必需字段说明

- restName：餐厅唯一标识（字符串，必须，决定数据路径）
- restNaam：餐厅显示名称（字符串，必须，页面标题/LOGO旁显示）
- restUrlName：餐厅URL名称（字符串，必须，部分跳转/展示用）
- whatsappRecipients：WhatsApp 通知接收人（数组，必须，至少1个手机号）
- whatsappBerichtAan：是否启用 WhatsApp 通知（布尔，必须，true/false）
- pythonAuth：后端认证URL（字符串，必须，影响登录/鉴权）
- WebHook：订单推送地址（字符串，必须，订单下单依赖）
- tafelRaw/tafelId：桌号参数（字符串，必须，决定桌面数据路径）
- translateOn：是否启用谷歌翻译（布尔，建议配置，true/false，默认true）

> 说明：如缺少上述任一字段，部分核心功能（下单、通知、认证等）将无法正常工作。
> 其他字段如 timeLimit、titleImage、etenLimiet 等为可选增强项。

## 主要功能文件结构说明

- index.html：主页面，包含所有UI入口、PIN弹窗、菜单、订单等主要结构。
- firebase-loader.js：页面初始化、配置加载、PIN校验、菜单/人数加载、谷歌翻译开关等核心入口。
- class-order-js.js：订单与菜单数据结构、订单操作主逻辑（Order类）。
- sendingOrder.js：订单提交、Webhook推送、WhatsApp通知、发送流程控制。
- whatsapp-module.js：WhatsApp 消息构建与发送、云端接口调用。
- javascript.js：菜单渲染、按钮交互、订单历史、前端业务逻辑（部分与class-order-js.js配合）。
- uitility.js：前端动画、辅助函数等。
- style-css.css / notification-css.css：主样式与通知样式。
- verificatie-realtimeListener-js.js：实时监听、PIN/状态变更处理（如有）。
- translation-js.js / translation-verificatie-js.js：多语言翻译相关逻辑（如有）。

> 说明：所有功能文件均位于 public 目录下，部分子目录（如 kokohili-files/）为多门店/多版本兼容。

## 订单功能相关云函数汇总

- WebHook（config.WebHook）
  - 用途：订单数据推送到后端/打印/第三方系统。
  - 调用方式：sendingOrder.js 中 fetch(WebHook, ...)

- sendWhatsAppMessage（<https://europe-west1-diditaxi-klantenservice.cloudfunctions.net/sendWhatsAppMessage>）
  - 用途：发送 WhatsApp 通知给指定手机号。
  - 调用方式：whatsapp-module.js 中 window.sendWhatsAppMessage

- sendWhatsAppTemplate（<https://whatsapp-food-order-template-15705369993.europe-west1.run.app/send-template>）
  - 用途：发送 WhatsApp 模板消息（如有）。
  - 调用方式：whatsapp-module.js 中 window.sendWhatsAppTemplate

- 本地 WhatsApp 机器人状态检测（<https://whatsapp.cislink.nl/status>）
  - 用途：检测本地 WhatsApp 机器人是否在线。
  - 调用方式：sendingOrder.js 中 isLocalWhatsAppOnline

- 本地 WhatsApp 机器人发送（如 window.sendOrderViaLocalWWeb，具体实现可能在本地服务端/浏览器插件）
  - 用途：本地优先发送 WhatsApp 消息。
  - 调用方式：sendingOrder.js 中 sendViaLocal

> 说明：如需扩展云函数或变更接口地址，请同步更新 config 配置及相关 JS 文件。

## 项目安全隐患与改进建议

1. Firebase 数据库读写权限
   - 隐患：如未设置合理的 rules，任何人可读写敏感数据。
   - 建议：配置 Firebase Realtime Database Rules，仅允许认证用户或特定IP/Token访问。

2. WebHook/云函数接口暴露
   - 隐患：WebHook、云函数接口如无鉴权，易被恶意调用或刷单。
   - 建议：所有 WebHook、云函数接口需校验签名、Token 或来源IP。

3. WhatsApp/通知接口滥用
   - 隐患：接口被刷可能导致通知轰炸、费用增加。
   - 建议：加频率限制（Rate Limit），并对异常流量报警。

4. 前端敏感信息泄露
   - 隐患：如 server_access、API Key、Webhook 地址等暴露在前端，易被抓包利用。
   - 建议：敏感信息仅后端保存，前端只用最小必要信息。

   **解决方案：**
   1. 严格区分前后端职责，所有密钥、API Key、Webhook 地址等敏感信息仅存储在后端服务器或受控的云函数环境变量中，前端通过受控接口间接获取所需数据。
   2. 前端配置文件（如 config）中仅保留必要的非敏感参数，敏感参数通过后端接口动态下发且需鉴权。
   3. 利用环境变量（如 .env 文件、云函数环境变量）管理敏感信息，避免硬编码在前端代码或公开仓库。
   4. 对所有前端与后端/云函数的通信接口增加鉴权校验（如 Token、签名、Referer 校验等），防止未授权访问。
   5. 定期安全审计前端代码，使用自动化工具扫描敏感信息泄露风险。
   6. 如需调试敏感信息，务必在生产环境前移除相关调试代码和日志。

   **建议存入环境变量的敏感配置项：**
   - server_access（服务端密钥）
   - API Key（如有第三方服务调用密钥）
   - WebHook 地址（订单推送/通知接口地址）
   - pythonAuth（后端认证URL）
   - WhatsApp 云函数接口密钥（如有）
   - 数据库连接密钥（如有后端服务）
   - 其他第三方服务密钥（如短信、支付、打印等）

   > 以上敏感值应仅在后端或云函数环境变量中配置，前端不应直接暴露。

5. PIN/认证机制
   - 隐患：PIN 校验如无防爆破措施，易被猜解。
   - 建议：PIN输错多次后临时锁定，或增加验证码。

6. XSS/CSRF 风险
   - 隐患：如未对用户输入做过滤，可能被注入恶意脚本。
   - 建议：所有输入严格校验和转义，重要操作加CSRF Token。

7. 依赖第三方服务可用性
   - 隐患：谷歌翻译、WhatsApp云函数等第三方服务不可用时影响业务。
   - 建议：增加降级方案和用户提示，关键链路多活备份。

> 后续如有新安全需求或发现新隐患，请持续补充并跟进整改进度。

如需补充其他变更记录，请继续告知。

## Asian Boulevard 当前 config 配置摘要（2025-08-19）

餐厅名称：Asian Boulevard

主要配置字段：

- WebHook: "<https://asianboulevard.cislink.nl/create-order>"
- WebHookStatus: "<https://asianboulevard.cislink.nl/health>"
- defaultPin: 9986
- dessertLimiet: 2
- etenLimiet: 4
- functionsBaseUrl: "<https://europe-west1-cislink-351208.cloudfunctions.net/app>"
- geoBaseLat: 52.324466524141364
- geoBaseLon: 4.884722674118321
- geoEnabled: true
- geoRadiusMeters: 300
- maxTijd: 120
- pythonAuth: "<https://asianboulevard.cislink.nl/authenticate>"
- requirePinToClose: true
- restNaam: "Asian Boulevard"
- restName: "Asian Boulevard"
- restUrlName: "AsianBoulevard"
- round_time: 15
- server_access: "Time9changeit"
- timeLimit: true
- titleImage: "<https://cislink.nl/asianboulevard/ab-logo-gold.webp>"
- translateOn: false
- whatsappBerichtAan: false
- whatsappPhone: 31683560665
- whatsappRecipients: [未展示，实际为手机号数组]

> 以上为 2025-08-19 日 Asian Boulevard 餐厅 config 主要配置项快照，便于后续对比和排查。
