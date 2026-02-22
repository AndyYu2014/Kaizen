// ========================================
// 精益管理 - 共享工具函数
// ========================================

window.KZ = window.KZ || {};

// ── API 调用封装 ──────────────────────────
KZ.api = function(method, args) {
  return frappe.call({ method: method, args: args || {} })
    .then(r => r.message)
    .catch(err => {
      console.error("KZ API Error:", err);
      frappe.msgprint({ title: "错误", message: err.message || "请求失败", indicator: "red" });
      throw err;
    });
};

// ── 状态标签映射 ──────────────────────────
KZ.statusClass = {
  "待提交": "draft",
  "已提交": "submitted",
  "已立项": "approved",
  "已取消": "cancelled",
  "方案编制中": "planning",
  "实施中": "implementing",
  "评价中": "evaluating",
  "已关闭": "closed"
};

KZ.tag = function(text) {
  const cls = KZ.statusClass[text] || "type";
  return `<span class="kz-tag ${cls}">${text}</span>`;
};

// ── 日期格式化 ──────────────────────────
KZ.formatDate = function(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

KZ.formatDatetime = function(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${KZ.formatDate(dateStr)} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

// ── Toast 提示 ──────────────────────────
KZ.toast = function(msg, type) {
  const colors = { success: "#52c41a", error: "#ff4d4f", info: "#1677ff" };
  const color = colors[type] || colors.info;
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; top:60px; left:50%; transform:translateX(-50%);
    background:${color}; color:#fff; padding:10px 20px; border-radius:20px;
    font-size:14px; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.15);
    transition:opacity 0.3s;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 2000);
};

// ── 加载状态 ──────────────────────────
KZ.showLoading = function(container) {
  if (typeof container === "string") container = document.getElementById(container);
  if (container) container.innerHTML = '<div class="kz-loading">加载中...</div>';
};

KZ.showEmpty = function(container, text) {
  if (typeof container === "string") container = document.getElementById(container);
  if (container) container.innerHTML = `
    <div class="kz-empty">
      <div class="icon">📋</div>
      <div class="text">${text || "暂无数据"}</div>
    </div>`;
};

// ── URL 参数 ──────────────────────────
KZ.getParam = function(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
};

KZ.goTo = function(url) {
  window.location.href = url;
};

// ── 星级组件 ──────────────────────────
KZ.renderStars = function(containerId, current, onChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let val = current || 0;

  function render() {
    el.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.className = "star" + (i <= val ? " active" : "");
      star.textContent = "★";
      star.addEventListener("click", () => {
        val = i;
        render();
        if (onChange) onChange(val);
      });
      el.appendChild(star);
    }
  }
  render();
  return { getValue: () => val };
};

// ── 文件上传 ──────────────────────────
KZ.initUpload = function(areaId, inputId, callback) {
  const area = document.getElementById(areaId);
  const input = document.getElementById(inputId);
  if (!area || !input) return;

  area.addEventListener("click", () => input.click());
  input.addEventListener("change", function() {
    const file = this.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_private", "0");
    formData.append("doctype", "Kaizen Proposal");
    formData.append("docfield", "phenomenon_attachments");

    fetch("/api/method/upload_file", {
      method: "POST",
      headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
      body: formData
    })
    .then(r => r.json())
    .then(data => {
      if (data.message && callback) callback(data.message.file_url);
      KZ.toast("上传成功", "success");
    })
    .catch(() => KZ.toast("上传失败", "error"));
  });
};

// ── 折线图（简易 Canvas 实现）──────────────
KZ.drawLineChart = function(canvasId, data, labels) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight;
  const pad = { top: 20, right: 20, bottom: 30, left: 36 };

  ctx.clearRect(0, 0, W, H);

  if (!data || !data.length) {
    ctx.fillStyle = "#999";
    ctx.textAlign = "center";
    ctx.fillText("暂无数据", W / 2, H / 2);
    return;
  }

  const max = Math.max(...data, 1);
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // 网格
  ctx.strokeStyle = "#eee";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = "#999";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(max - (max / 4) * i), pad.left - 4, y + 4);
  }

  // 折线
  const points = data.map((v, i) => ({
    x: pad.left + (chartW / (data.length - 1 || 1)) * i,
    y: pad.top + chartH - (v / max) * chartH
  }));

  ctx.beginPath();
  ctx.strokeStyle = "#1677ff";
  ctx.lineWidth = 2;
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // 填充区域
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
  ctx.lineTo(points[0].x, pad.top + chartH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, "rgba(22,119,255,0.15)");
  grad.addColorStop(1, "rgba(22,119,255,0)");
  ctx.fillStyle = grad;
  ctx.fill();

  // 点
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#1677ff";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  });

  // X 轴标签
  if (labels) {
    ctx.fillStyle = "#999";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    labels.forEach((l, i) => {
      const x = pad.left + (chartW / (labels.length - 1 || 1)) * i;
      ctx.fillText(l, x, H - 6);
    });
  }
};
