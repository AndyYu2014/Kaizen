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
    if (window.frappe && typeof frappe.call === 'function') {
      const resp = await frappe.call({ method, args, freeze: false });
      if (resp && resp.message !== undefined) return resp.message;
      throw new Error('API????');
    }

    const url = `/api/method/${method}`;
    const hasArgs = args && Object.keys(args).length > 0;
    const headers = { 'Content-Type': 'application/json' };
    if (window.frappe && frappe.csrf_token) {
      headers['X-Frappe-CSRF-Token'] = frappe.csrf_token;
    }

    const isReadMethod = /\.get_[a-z0-9_]+$/i.test(method);
    const query = hasArgs ? ('?' + new URLSearchParams(args).toString()) : '';
    const resp = await fetch(isReadMethod ? (url + query) : url, {
      method: isReadMethod ? 'GET' : (hasArgs ? 'POST' : 'GET'),
      headers,
      body: isReadMethod ? undefined : (hasArgs ? JSON.stringify(args) : undefined),
      credentials: 'same-origin',
    });

    if (!resp.ok) {
      throw new Error(`API???? ${resp.status}`);
    }

    const data = await resp.json();
    if (data && data.message !== undefined) return data.message;
    throw new Error('API????');
  },

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

,

  // ???????
  initMediaInput(containerId) {
    const root = document.getElementById(containerId);
    if (!root) return;
    const state = {
      photos: [],
      videos: [],
      audios: [],
      files: [],
      location: null,
      people: []
    };

    const updateList = () => {
      const list = root.querySelector('.kz-media-list');
      if (!list) return;
      const parts = [];
      if (state.photos.length) parts.push(`??:${state.photos.length}`);
      if (state.videos.length) parts.push(`??:${state.videos.length}`);
      if (state.audios.length) parts.push(`??:${state.audios.length}`);
      if (state.files.length) parts.push(`??:${state.files.length}`);
      if (state.location) parts.push(`??:${state.location.lat.toFixed(4)},${state.location.lng.toFixed(4)}`);
      if (state.people.length) parts.push(`??:${state.people.join(',')}`);
      list.textContent = parts.length ? parts.join(' | ') : '???????';
    };

    const bindFile = (type, input) => {
      input.addEventListener('change', () => {
        const files = Array.from(input.files || []);
        state[type] = files;
        updateList();
      });
    };

    const photoInput = root.querySelector('input[data-media-input="photo"]');
    const videoInput = root.querySelector('input[data-media-input="video"]');
    const audioInput = root.querySelector('input[data-media-input="audio"]');
    const fileInput = root.querySelector('input[data-media-input="file"]');
    if (photoInput) bindFile('photos', photoInput);
    if (videoInput) bindFile('videos', videoInput);
    if (audioInput) bindFile('audios', audioInput);
    if (fileInput) bindFile('files', fileInput);

    const locationBtn = root.querySelector('[data-media="location"]');
    if (locationBtn) {
      locationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          this.toast('?????????');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          pos => {
            state.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            updateList();
          },
          () => this.toast('????')
        );
      });
    }

    const peopleBtn = root.querySelector('[data-media="people"]');
    if (peopleBtn) {
      peopleBtn.addEventListener('click', () => {
        const name = prompt('??????');
        if (name && name.trim()) {
          state.people.push(name.trim());
          updateList();
        }
      });
    }

    root._mediaState = state;
    updateList();
  },

  getMediaInputData(containerId) {
    const root = document.getElementById(containerId);
    if (!root || !root._mediaState) return null;
    const s = root._mediaState;
    return {
      photos: s.photos.map(f => f.name),
      videos: s.videos.map(f => f.name),
      audios: s.audios.map(f => f.name),
      files: s.files.map(f => f.name),
      location: s.location,
      people: s.people
    };
  }

};
