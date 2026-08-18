# 考研备考台 · 自托管 PWA（离线 + 跨设备真后台推送版）

这是「考研备考台」的**自托管 PWA** 构建，在离线版基础上支持：

- ✅ **断网秒开**：Service Worker 缓存应用外壳。
- ✅ **添加到主屏幕**：像个原生 App 一样打开（standalone）。
- ✅ **真后台复习提醒**：卡片按「艾宾浩斯遗忘曲线」（5分钟/30分钟/12小时/1天/2天/4天/7天/15天/30天）分阶段，由 Service Worker 在**应用关闭时**也到点弹出通知。
- ✅ **跨设备真后台推送**：配合 `../server` 推送后端（Web Push + VAPID），**手机锁屏 / 电脑关掉网页也能收到复习提醒**，且多端共享同一份备考数据。

> 平台在线链接 `workbuddy.link` 是托管域名，无法挂载自定义 `sw.js`，**后台推送不可用**，仅应用打开时轮询提醒。要真后台 + 跨设备，请自托管本套件 + 后端。

---

## 方案 A：只要离线 + 本机后台提醒（最简单）

把本目录（`index.html` / `manifest.webmanifest` / `sw.js` / `icon.svg`）整体上传到任意**静态托管**（HTTPS 或 localhost）：
GitHub Pages / Cloudflare Pages / Vercel / Netlify / 腾讯云 EdgeOne Pages / 自己的 Nginx。

1. 用 Chrome / Edge 桌面版或 Android Chrome 打开站点；
2. 「安装 / 添加到主屏幕」；
3. 设置里勾选 **允许浏览器桌面通知** 并授权；
4. 之后即使用户关闭网页，到点也会弹出来复习提醒（含问题与答案），点击跳「巩固」页定位卡片。

---

## 方案 B：跨设备真后台推送（需后端）

### 1) 启动推送后端（已包含在 `../server`）
```bash
cd ../server
npm install            # 安装 express + web-push
node gen-vapid.js      # 生成 VAPID 密钥并写入 .env
# 编辑 .env 填好（gen-vapid 已自动写入公钥/私钥），PORT 默认 8080
npm start
```
后端提供：`/api/sync`（共享状态读写）、`/api/subscribe`（保存 Push 订阅）、
`/api/vapid`（下发公钥）、以及一个 **60s 调度器**——读共享状态、算出到期复习卡片、经 Web Push 推送（应用关闭也弹，通知含答案/汇总）。

### 2) 部署方式（最简：免费 HTTPS）
- **前端**：Vercel / Cloudflare Pages / GitHub Pages 托管本目录；
- **后端**：Vercel / CloudFlare Function、或 Railway / Render 的 Node 容器（均自带 HTTPS）。
  把 `server/index.js` 作为 Node 服务部署即可，记得设环境变量 `VAPID_*` 与 `PORT`。
- 若前后端不同域，把前端 `index.html` 顶部 `PUSH_VAPID_PUBLIC_KEY` 填公钥，并把 `_BE_URL` 改为后端地址（默认取同源）。

### 3) 前端接线（二选一）
- **同源部署**（后端域名下同时托管前端）：无需改代码，`PUSH_VAPID_PUBLIC_KEY` 留空会自动从 `/api/vapid` 拉取。
- **跨域部署**：把 `index.html` 中
  ```js
  const PUSH_VAPID_PUBLIC_KEY = "";   // 填入后端 gen-vapid 的公钥
  let _BE_URL = "";                   // 改为 "https://your-backend.com"
  ```
  填好即可。

### 4) 使用
1. 用安装为 PWA 的浏览器打开站点，设置里开启「允许通知」并授权 → 自动 `subscribe` 上报后端；
2. 任一设备复习/打卡，状态经 `/api/sync` 共享到后端；
3. 后端到点经 Web Push 向**所有订阅设备**推送复习提醒（含卡片答案、多张汇总），**应用关闭也弹**。

---

## ⚠️ 平台支持差异
| 平台 | 应用关闭时也弹 | 说明 |
|------|----------------|------|
| Android Chrome / 桌面 Chrome·Edge（安装为 PWA） | ✅ | Web Push + Notification，跨设备真后台 |
| 未安装为 PWA 的桌面浏览器 | ⚠️ 仅应用打开时 | 退回应用内 20s 轮询兜底 |
| iOS / Safari | ❌（16.4+ 仅已安装到主屏可） | Apple 对 Web Push 支持有限 |

## 隐私说明
- 推送后端只存储 Push 订阅（浏览器生成、不含账号密码）与加密的备考状态，用于在你自己的设备间同步与按时推送；不联网第三方。
- `ws`（工作区）默认 `default`：同 `ws` 的订阅设备共享同一份数据。多人共用请为每个用户用不同 `ws`。
- 自托管即数据自持，请自行做好服务器备份。

## 何时用哪个
| 需求 | 用哪版 |
|------|--------|
| 手机+电脑实时同步、零部署 | 平台在线链接（推荐） |
| 真后台 + 跨设备推送提醒 | 本自托管 PWA + `../server` 后端 |
| 仅本机离线 + 后台提醒 | 本自托管 PWA（方案 A） |
