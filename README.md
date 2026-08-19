# 考研备考台 · Kaoyan Beikao Tai

> 一个自托管的考研备考管理平台：任务顺延调度、艾宾浩斯记忆复习、错题本 / 知识点卡片、模拟成绩趋势、跨设备状态同步，以及**关闭网页后仍弹出、且含答案的 PWA 后台推送**。

---

## ✨ 功能特性

- **结构化复习计划**：按科目、考试日期、优先级制定；每日动态规划 + 顺延堆积预警（连续 N 天未完成自动提醒）。
- **艾宾浩斯遗忘曲线**：9 段间隔（5m / 30m / 12h / 1d / 2d / 4d / 7d / 15d / 30d）+ 4 档反馈（again / hard / good / easy）动态调整复习节奏。
- **知识点卡片 + 错题本**：便于巩固薄弱项，支持按科目 / 标签筛选。
- **模拟测试与成绩趋势**：记录模考分数，可视化趋势。
- **自定义目标与完成度**：设定目标并统计进度。
- **跨设备同步**：后端 `/api/sync` 按 workspace 隔离做 LWW（最后写入获胜）合并。
- **真后台推送**：基于 PWA + Service Worker + Web Push（VAPID），到点弹出**含答案**的复习提醒；后端 60s 调度器到点转发。
- **PDF 背书记**：上传 PDF 或按科目一键检索关联资料，自动提取文本并识别关键知识点；支持两轮挖空，可分别设置极浅/浅层/中等/深层难度，递进式强化背诵。

## 📁 仓库结构

```
.
├── 考研备考台.html              # 平台链接版主程序（依赖 WorkBuddy 资料库 SDK 同步）
├── 考研备考台-pwa/              # 自托管 PWA 套件（部署用前端）
│   ├── index.html              #   应用主体
│   ├── sw.js                   #   Service Worker（push 事件处理）
│   ├── manifest.webmanifest    #   PWA 清单
│   ├── icon.svg                #   图标
│   └── README.md               #   自托管说明
├── server/                     # 推送后端（Node + Express + web-push）
│   ├── index.js                #   服务入口（含 /api/vapid、/api/sync、/api/subscribe、60s 调度）
│   ├── gen-vapid.js            #   生成 VAPID 密钥
│   ├── package.json            #   后端依赖
│   └── .env.example            #   环境变量模板
├── render.yaml                 # Render 一键部署 Blueprint
├── railway.json / railway.toml # Railway 部署配置
├── package.json                # 仓库根：供平台探测 Node
├── scripts/
│   └── push-to-github.sh       # 本地初始化 + 提交自动化脚本（不含推送）
└── .gitignore
```

> ⚠️ **VAPID 私钥、`server/.env`、`data/`、`.workbuddy/` 已被 `.gitignore` 排除，不会进入仓库。**

## 🚀 本地运行

```bash
# 后端（默认 http://localhost:8080，同源托管 PWA）
cd server && npm install && node index.js
# 浏览器打开 http://localhost:8080/ 即安装 PWA、授权推送
```

> 首次启动若未检测到 VAPID 密钥，会自动生成并保存到 `server/data/vapid.json`，无需手动填写。

## ☁️ 部署（一键）

| 平台 | 配置 | 说明 |
|---|---|---|
| **Render** | `render.yaml` | 仓库连 GitHub → New → Blueprint → 选中即自动构建 |
| **Railway** | `railway.json` / `railway.toml` | 连仓库 → 自动识别 → 部署 |

部署后访问 `https://<你的域名>/` 即可使用；在手机 / 电脑授权推送后，关闭网页也按时收到含答案的复习提醒。

## 🔔 跨设备推送原理

- 前端在授权后通过 `pushManager.subscribe` 上报订阅到后端 `/api/subscribe`。
- 后端每 60s 读取共享状态，计算到期卡片，用 `web-push` 推送到各设备。
- 410 / 404 响应自动清理失效订阅。

详细部署与排障见 [`考研备考台-部署指引.md`](./考研备考台-部署指引.md)。

## 📜 License

[MIT](./LICENSE)
