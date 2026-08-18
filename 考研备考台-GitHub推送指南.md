# 考研备考台 · 推送到 GitHub 指南（含可直接导入的仓库结构）

> 目标：把当前本地工作区整理为「GitHub 导入标准」仓库并推送到你的 GitHub 账号，使他人 `git clone` 后即可按文档一键部署（Render / Railway）并获得跨设备后台推送能力。

---

## 一、背景状态

| 项目 | 当前状态 |
|---|---|
| Git 仓库 | ❌ **尚未初始化**（检测：`git rev-parse --is-inside-work-tree` → `NOT_GIT`） |
| 可部署产出 | ✅ `server/`（Node 后端 + Web Push + VAPID 零配置）、`考研备考台-pwa/`（自托管 PWA）、`render.yaml` / `railway.json` / `railway.toml`、根 `package.json` |
| 仓库结构文件 | ✅ 本次已补齐：根 `.gitignore`、`README.md`、`LICENSE`、`scripts/push-to-github.sh` |
| 远程仓库 | ❌ 未创建（需你手动在 GitHub 网页创建） |
| 首次提交 | ✅ 本次脚本已自动完成（`git init` + `git add` + `git commit`） |
| 推送 | ⏳ 需你手动执行（依赖你的 GitHub 账号 / SSH） |

> 早前测试残留目录 `server/_persist`、`server/_smoketest` 已清理。

---

## 二、最终目标

得到一个结构标准、可一键部署的公开（或私有）GitHub 仓库：

```
kaoyan-beikao-tai/
├── 考研备考台.html
├── 考研备考台-pwa/   (index.html, sw.js, manifest.webmanifest, icon.svg, README.md)
├── server/           (index.js, gen-vapid.js, package.json, .env.example)
├── render.yaml
├── railway.json / railway.toml
├── package.json
├── scripts/push-to-github.sh
├── README.md
├── LICENSE
└── .gitignore
```

`.gitignore` 已确保 **不入库**：`node_modules/`、`.env`、VAPID 私钥 `data/`、`.workbuddy/` 个人记忆。

---

## 三、自动 vs 手动 分工

| 阶段 | 由谁完成 | 具体动作 |
|---|---|---|
| ① 检测 git | 🤖 脚本自动 | 已存在则复用，不存在则 `git init -b main` |
| ② 创建仓库结构 | 🤖 已为你生成 | `.gitignore` / `README.md` / `LICENSE` / 推送脚本（已写入磁盘） |
| ③ 暂存 + 首次提交 | 🤖 脚本自动 | `git add .` + `git commit`（已执行） |
| ④ 创建 GitHub 远程仓库 | 👤 你手动 | GitHub 网页 New repository（空仓库） |
| ⑤ 配置 SSH / Token | 👉 你手动 | `ssh-keygen` + 粘贴公钥，或用 HTTPS + PAT |
| ⑥ 添加 remote + 推送 | 👤 你手动 | `git remote add` + `git push -u origin main` |

> 自动部分已在本机执行完毕；下面第④⑤⑥步必须由你操作（涉及你的账号凭证，脚本无法代劳）。

---

## 四、逐步操作指令

### 自动（已完成，无需你操作）
- 脚本 `scripts/push-to-github.sh` 已完成：检测 → 初始化（分支 `main`）→ 暂存 → 首次提交。
- 仓库结构文件已写入当前目录。

### 手动（需你按顺序执行）

**S1 · 创建远程仓库（网页）**
1. 浏览器打开 <https://github.com/new>
2. Repository name 填 `kaoyan-beikao-tai`（可自定）
3. 可见性选 **Public** 或 **Private**（含推送后端，私有更稳妥）
4. **不要**勾选 *Add a README file* / *.gitignore* / *License*（保持空仓库，避免首次 push 冲突）
5. 点击 **Create repository**

**S2 · 配置 SSH（一次性）**（若已配置可跳过）
```bash
ssh-keygen -t ed25519 -C "你的邮箱@example.com"
cat ~/.ssh/id_ed25519.pub      # 复制输出
```
把公钥粘贴到 GitHub → 右上角头像 → **Settings → SSH and GPG keys → New SSH key**。
> 不愿用 SSH 也可改用 HTTPS + Personal Access Token（Token 需勾选 `repo` 权限），push 时用户名填 GitHub 账号、密码填 Token。

**S3 · 关联远程并推送**
```bash
git remote add origin git@github.com:<你的用户名>/kaoyan-beikao-tai.git
git branch -M main
git push -u origin main
```
> 若远程仓库被勾选了 README 导致拒绝，先 `git pull --rebase origin main` 再 push；或最省事：S1 时保持空仓库。

**S4 · 验证**
- 刷新 GitHub 页面，应看到全部文件（无 `node_modules`、无 `.env`、无 `.workbuddy`）。
- 进入 **Settings → Secrets / 无需**（VAPID 由后端首次启动自动生成，无需在 GitHub 填密钥）。

---

## 五、最终可直接复制运行的命令清单

### A. 本地自动部分（已为你执行；如需重跑）
```bash
bash scripts/push-to-github.sh "chore: 初始化考研备考台仓库"
```

### B. 手动部分（替换 `<USER>` 与仓库名后运行）
```bash
# 1) 配置 SSH（仅首次）
ssh-keygen -t ed25519 -C "你的邮箱@example.com"
cat ~/.ssh/id_ed25519.pub        # 复制到 GitHub SSH keys

# 2) 关联远程并推送
git remote add origin git@github.com:<USER>/kaoyan-beikao-tai.git
git branch -M main
git push -u origin main
```

### C. 后续日常提交（示例）
```bash
git add .
git commit -m "feat: 描述你的改动"
git push
```

---

## 六、注意事项 / 约束

1. **私钥与敏感数据**：`server/.env`、VAPID 私钥（`server/data/vapid.json`）、`.workbuddy/` 已被 `.gitignore` 屏蔽，**不会**进入仓库；请勿手动 `git add -f` 强制加入。
2. **默认分支**：统一为 `main`（脚本已设），避免与远程默认分支不一致导致 push 被拒。
3. **空仓库原则**：GitHub 新建仓库时保持空，否则首次 push 因历史冲突被拒。
4. **部署联动**：仓库就绪后，在 Render / Railway 连该 GitHub 仓库即可按 `render.yaml` / `railway.*` 自动部署；后端首次启动自动生成 VAPID，无需在平台填密钥（免费临时磁盘会重置密钥，重授权一次订阅即可）。
5. **HTTPS 必需**：Web Push 要求后端为 HTTPS（平台子域自带），本地 `localhost` 调试可豁免。
6. **iOS 限制**：Safari 需 iOS 16.4+ 且已“添加到主屏幕”安装才支持 Web Push；否则降级为应用内轮询。

---

## 七、一键路径总结

```
本地已有结构文件 + 已 init/commit  ──(你手动)──▶  建空 GitHub 仓库
        │                                            │
        └────────── git push -u origin main ◀────────┘
                              │
                              ▼
                   GitHub 仓库就绪 → Render/Railway 一键部署
```
