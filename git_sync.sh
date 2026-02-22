#!/bin/bash
# ============================================================
# GitHub 同步脚本
# 使用方法: bash git_sync.sh "提交说明"
# ============================================================
MSG="${1:-更新精益管理模块}"
cd "$(dirname "${BASH_SOURCE[0]}")"
git add -A
git commit -m "$MSG"
git push origin main
echo "✓ 已同步到GitHub"
