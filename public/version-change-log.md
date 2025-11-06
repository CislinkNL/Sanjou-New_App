# version-change-log.md

## 项目整体功能概述

本项目为“Mobile Order System”，主要功能包括：

- 用户下单、批量下单、订单管理
- 管理员设置与配置
- 实时监听与通知
- 多语言支持
- 微信/WhatsApp 集成
- 二维码生成与扫码点单
- 桌号管理
- Firebase 集成
- 权限验证与认证

## 主要功能文件说明

- `index.html`：主页面，入口文件
- `admin.html`：管理员设置页面
- `admin-settings.js`：管理员设置相关逻辑
- `auth-js.js`：认证与权限相关逻辑
- `batch-orders-patch.js`：批量订单处理
- `class-order-js.js`：订单类与订单管理
- `config.js`：全局配置文件
- `firebase-loader.js`：Firebase 初始化与加载
- `food-info-js.js`：菜品信息管理
- `javascript.js`：主业务逻辑
- `notification-css.css`：通知样式
- `qrcode.min.js`：二维码生成库
- `script-js.js`：通用脚本
- `sendingOrder.js`：订单发送逻辑
- `style-css.css`：主样式表
- `style-verificatie.css`：验证相关样式
- `translation-js.js`：多语言支持
- `translation-verificatie-js.js`：验证页面多语言支持
- `uitility.js`：工具函数
- `verificatie-realtimeListener-js.js`：验证实时监听
- `whatsapp-module.js`：WhatsApp 集成
- `wweb.js`：Web 相关逻辑

## 必须的配置文件

- `config.js`：包含 Firebase、API、环境等配置信息，项目运行必需
- `njoy-tafel.json`：桌号配置文件
- `tafel nummers.txt`/`tafel-nummers.txt`：桌号文本配置

## 依赖与资源

- `qrcode.min.js`：二维码生成依赖
- `webfonts/`：字体资源（FontAwesome）
- `fontawesome-local.css`：本地字体样式

## 其他说明

## config数据库快照字段说明（EnjoyBoxmeer示例）

| 字段名                | 必须/可选 | 说明 |
|----------------------|-----------|------|
| WebHook              | 必须      | 订单创建API地址 |
| WebHookStatus        | 可选      | 健康检查API地址 |
| defaultPin           | 必须      | 默认PIN码，用于认证/操作 |
| dessertLimiet        | 可选      | 甜品下单数量上限 |
| dinner_only          | 可选      | 晚餐专用标记，留空为不限 |
| etenLimiet           | 可选      | 主餐下单数量上限 |
| maxTijd              | 必须      | 单次下单最大等待时间（秒） |
| pythonAuth           | 必须      | 认证API地址 |
| requirePinToClose    | 可选      | 关闭订单是否需要PIN |
| restNaam             | 必须      | 餐厅显示名称 |
| restName             | 可选      | 餐厅英文名（如有多语言需求）|
| restUrlName          | 可选      | 餐厅URL标识 |
| round_time           | 可选      | 轮询/刷新时间间隔 |
| server_access        | 可选      | 服务端访问控制字段 |
| timeLimit            | 可选      | 是否启用下单时间限制 |
| titleImage           | 可选      | 餐厅LOGO图片URL |
| translateOn          | 可选      | 是否启用多语言 |
| whatsappBerichtAan   | 可选      | 是否启用WhatsApp通知 |
| whatsappPhone        | 可选      | WhatsApp通知手机号 |
| whatsappRecipients   | 可选      | WhatsApp通知接收人列表 |

**说明：**

- “必须”字段为系统正常运行所必需，缺失会导致主要功能不可用。
- “可选”字段为增强功能或特定场景下使用，未配置时系统可正常运行但部分功能不可用。

> 本日志用于记录当前版本的整体功能与配置文件，便于后续版本迭代与维护。