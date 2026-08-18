#!/usr/bin/env bash
# =====================================================================
# 考研备考台 · 本地仓库初始化与首次提交脚本（仅做“本地”部分）
# ---------------------------------------------------------------------
# 自动完成：检测 git → 不存在则 init（默认分支 main）→ 暂存 → 提交
# 不做：    远程仓库创建、SSH 配置、git push（这些需你的 GitHub 账号，见指南）
# 用法：     bash scripts/push-to-github.sh ["自定义提交信息"]
# =====================================================================
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
echo "📁 仓库目录: $REPO_DIR"

# ---- 1. 检测 git 是否已初始化 ----
if [ -d .git ]; then
  echo "✅ 已检测到 .git，复用现有仓库。"
else
  echo "🆕 未初始化，正在 git init（默认分支 main）..."
  git init
  git branch -M main 2>/dev/null || true
  echo "✅ 已初始化。"
fi

# ---- 2. 必要文件预检（缺失则提示，不擅自覆盖你的文件） ----
for f in .gitignore README.md LICENSE; do
  if [ ! -f "$f" ]; then
    echo "⚠️  缺少 $f，请先按指南“创建仓库结构”步骤补上再提交。"
  fi
done

# ---- 3. 暂存全部（.gitignore 已排除 node_modules/.env/data/.workbuddy 等） ----
git add .

if git diff --cached --quiet; then
  echo "ℹ️  没有需要提交的变更（工作区与已提交内容一致）。"
else
  MSG="${1:-chore: 初始化考研备考台仓库（后端 + PWA 套件 + 部署配置）}"
  git commit -m "$MSG"
  echo "✅ 已创建初始提交：$(git rev-parse --short HEAD)"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  以下为【手动步骤】，本脚本无法代劳（需要你的 GitHub 账号）："
echo "══════════════════════════════════════════════════════════════"
echo "1) 打开 https://github.com/new 新建仓库"
echo "   · 仓库名自定，如 kaoyan-beikao-tai"
echo "   · 不要勾选 Initialize with README/.gitignore/LICENSE（保持空仓库）"
echo "2) 配置 SSH（若未配置）："
echo "     ssh-keygen -t ed25519 -C \"你的邮箱\""
echo "     cat ~/.ssh/id_ed25519.pub   # 复制到 GitHub → Settings → SSH and GPG keys"
echo "   或改用 HTTPS + Personal Access Token（需 repo 权限）"
echo "3) 在本机执行（替换 <USER> 与 <REPO>）："
echo "     git remote add origin git@github.com:<USER>/<REPO>.git"
echo "     git branch -M main"
echo "     git push -u origin main"
echo "══════════════════════════════════════════════════════════════"
