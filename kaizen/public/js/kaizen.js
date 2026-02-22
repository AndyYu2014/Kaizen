/* ===== 精益管理全局工具函数 ===== */
window.KaizenUtils = {

  // Toast提示
  toast(msg, duration = 2000) {
    let el = document.getElementById('kz-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kz-toast';
      el.className = 'kz-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
  },

  // 状态标签CSS类映射
  statusClass(status) {
    const map = {
      '待提交': 'kz-tag-status-pending',
      '已提交': 'kz-tag-status-submitted',
      '已立项': 'kz-tag-status-approved',
      '已取消': 'kz-tag-status-cancelled',
      '方案编制中': 'kz-tag-status-planning',
      '实施中': 'kz-tag-status-implementing',
      '评价中': 'kz-tag-status-evaluating',
      '已关闭': 'kz-tag-status-closed',
    };
    return map[status] || 'kz-tag-type';
  },

  // 星级渲染
  renderStars(count, max = 5) {
    let html = '';
    for (let i = 1; i <= max; i++) {
      html += `<span class="kz-star ${i <= count ? 'active' : ''}">★</span>`;
    }
    return html;
  },

  // 日期格式化
  formatDate(dateStr) {
    if (!dateStr) return '-';
    return dateStr.substring(0, 10);
  },

  // API调用封装
  async call(method, args = {}) {
    const resp = await frappe.call({ method, args, freeze: false });
    if (resp && resp.message !== undefined) return resp.message;
    throw new Error('API调用失败');
  },

  // 加载中状态
  showLoading(container) {
    container.innerHTML = `<div class="kz-loading">
      <div class="kz-spinner"></div>
      <div>加载中...</div>
    </div>`;
  },

  // 空状态
  showEmpty(container, text = '暂无数据') {
    container.innerHTML = `<div class="kz-empty">
      <div class="kz-empty-icon">📋</div>
      <div class="kz-empty-text">${text}</div>
    </div>`;
  },

  // 跳转
  goto(path) {
    window.location.href = path;
  }
};
