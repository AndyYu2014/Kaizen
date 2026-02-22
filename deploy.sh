#!/bin/bash
# ============================================================
# 精益管理模块 部署脚本
# 适用于 ERPNext 16 / Ubuntu 22.04
# 使用方法: bash deploy.sh [bench目录] [站点名]
# 示例: bash deploy.sh /home/frappe/frappe-bench mysite.com
# ============================================================
set -e

BENCH_DIR="${1:-/home/frappe/frappe-bench}"
SITE_NAME="${2:-site1.local}"
APP_NAME="kaizen"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================================"
echo "  精益管理模块 部署脚本"
echo "  Bench目录: $BENCH_DIR"
echo "  站点名称: $SITE_NAME"
echo "================================================"

# 1. 复制App到bench/apps目录
echo ""
echo ">>> [Step 1/6] 复制App文件..."
if [ -d "$BENCH_DIR/apps/$APP_NAME" ]; then
    echo "    检测到已存在，备份旧版本..."
    cp -r "$BENCH_DIR/apps/$APP_NAME" "$BENCH_DIR/apps/${APP_NAME}_backup_$(date +%Y%m%d%H%M%S)"
fi
cp -r "$REPO_DIR" "$BENCH_DIR/apps/$APP_NAME"
echo "    ✓ 文件复制完成"

# 2. 安装Python包
echo ""
echo ">>> [Step 2/6] 安装Python依赖..."
cd "$BENCH_DIR"
./env/bin/pip install -e apps/$APP_NAME --quiet
echo "    ✓ Python包安装完成"

# 3. 安装App到站点
echo ""
echo ">>> [Step 3/6] 安装App到站点..."
bench --site "$SITE_NAME" install-app $APP_NAME
echo "    ✓ App已安装到站点"

# 4. 数据库迁移
echo ""
echo ">>> [Step 4/6] 执行数据库迁移..."
bench --site "$SITE_NAME" migrate
echo "    ✓ 数据库迁移完成"

# 5. 构建静态资源
echo ""
echo ">>> [Step 5/6] 构建静态资源..."
bench build --app $APP_NAME
echo "    ✓ 静态资源构建完成"

# 6. 重启服务
echo ""
echo ">>> [Step 6/6] 重启服务..."
bench restart
echo "    ✓ 服务重启完成"

echo ""
echo "================================================"
echo "  🎉 部署成功！"
echo "  访问地址: http://[您的服务器IP]/$SITE_NAME/kaizen-home"
echo "================================================"
