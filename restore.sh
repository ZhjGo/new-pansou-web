#!/bin/bash
# PanSou Web 自救脚本：VM 重启会清空 /etc/systemd/system，此脚本幂等重建
# 步骤：检查 www 目录→重装 systemd 服务→启动→健康检查
# 输出: HEALTHY / DEGRADED / FAILED:<原因> ; 退出码 0=自救成功(或本就健康), 非0=失败
set -u
APP=/home/hatch/workspace/pansou-web
WWW=$APP/www
DATA=$APP/data
LOG=$DATA/restore.log
UNIT_SRC=$APP/pansou-web.service
UNIT_DST=/etc/systemd/system/pansou-web.service
mkdir -p "$DATA"
log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

rescued=0

# 1. 静态文件必须存在
if [ ! -f "$WWW/index.html" ]; then
  log "FAILED: $WWW/index.html missing"
  echo "FAILED: www/index.html missing"
  exit 1
fi

# 2. systemd 单元就位（VM 重启后 /etc 被清空，需重装）
if [ ! -f "$UNIT_DST" ] || ! cmp -s "$UNIT_SRC" "$UNIT_DST"; then
  cp "$UNIT_SRC" "$UNIT_DST" || { log "FAILED: install unit"; echo "FAILED: install unit"; exit 1; }
  systemctl daemon-reload || { log "FAILED: daemon-reload"; echo "FAILED: daemon-reload"; exit 1; }
  systemctl enable pansou-web >>"$LOG" 2>&1
  log "(re)installed pansou-web.service"
  rescued=1
fi

# 3. 服务运行中
if ! systemctl is-active -q pansou-web; then
  systemctl start pansou-web >>"$LOG" 2>&1 || { log "FAILED: start"; echo "FAILED: start pansou-web"; exit 1; }
  log "started pansou-web"
  rescued=1
  sleep 2
fi

# 4. 健康检查：本地 8890 返回 200
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:8890/ 2>/dev/null || echo "000")
if [ "$code" = "200" ]; then
  [ "$rescued" = "1" ] && log "rescued, healthy now"
  echo "HEALTHY"
  exit 0
fi

# 5. 端口被占或服务异常：尝试重启一次
log "DEGRADED: http code $code, restarting"
systemctl restart pansou-web >>"$LOG" 2>&1
sleep 3
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:8890/ 2>/dev/null || echo "000")
if [ "$code" = "200" ]; then
  log "rescued via restart"
  echo "HEALTHY"
  exit 0
fi

log "FAILED: still code $code after restart"
echo "DEGRADED: http $code, see $LOG"
exit 1
