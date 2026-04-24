const UI = {
  toast(msg, type) {
    type = type || 'info';
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span>' + (icons[type]||'') + '</span><span>' + msg + '</span>';
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; setTimeout(() => el.remove(), 300); }, 2500);
  },
  modal(title, bodyHTML, opts) {
    opts = opts || {};
    const ov = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    box.className = opts.large ? 'large' : '';
    const oldF = box.querySelector('.modal-footer');
    if (oldF) oldF.remove();
    if (opts.footer) { const f = document.createElement('div'); f.className = 'modal-footer'; f.innerHTML = opts.footer; box.appendChild(f); }
    ov.style.display = 'flex';
    ov.onclick = function(e) { if (e.target === ov) UI.closeModal(); };
    document.getElementById('modal-close').onclick = function() { UI.closeModal(); };
    // 渲染完成后执行回调（用于在嵌套模态框场景下恢复被覆盖的 DOM）
    if (typeof opts.afterRender === 'function') {
      opts.afterRender();
    }
  },
  closeModal() { document.getElementById('modal-overlay').style.display = 'none'; },
  alert(msg) {
    this.modal('提示', '<div class="confirm-content"><div class="icon">ℹ️</div><div class="msg">' + msg + '</div></div>',
      { footer: '<button class="btn-primary" onclick="UI.closeModal()">确定</button>' });
  },
  confirm(msg, onYes, opts) {
    opts = opts || {};
    var hadOpenModal = document.getElementById('modal-overlay').style.display !== 'none';
    var savedBody, savedTitle, savedBoxClass;
    if (hadOpenModal && opts.noRestore) {
      savedBody = document.getElementById('modal-body').innerHTML;
      savedTitle = document.getElementById('modal-title').textContent;
      savedBoxClass = document.getElementById('modal-box').className;
    }
    this.modal('操作确认', '<div class="confirm-content"><div class="icon">⚠️</div><div class="msg">' + msg + '</div></div>',
      { footer: '<button class="btn-outline" id="confirm-cancel-btn">取消</button><button class="btn-danger" id="confirm-yes-btn">确定</button>' });
    var self = this;
    document.getElementById('confirm-cancel-btn').onclick = function() {
      if (hadOpenModal && opts.noRestore) {
        document.getElementById('modal-body').innerHTML = savedBody;
        document.getElementById('modal-title').textContent = savedTitle;
        document.getElementById('modal-box').className = savedBoxClass;
      }
      self.closeModal();
    };
    document.getElementById('confirm-yes-btn').onclick = function() { 

      onYes();

      if (opts.noRestore) {

        // 恢复原编辑界面并保持弹窗打开

        document.getElementById('modal-body').innerHTML = savedBody;

        document.getElementById('modal-title').textContent = savedTitle;

        document.getElementById('modal-box').className = savedBoxClass;

      } else if (opts.closeOnConfirm === false) {

        // 不关闭，由调用方处理

      } else if (hadOpenModal) {

        document.getElementById('modal-body').innerHTML = '';

        self.closeModal();

      } else {

        self.closeModal();

      }

    };
  },
  statusTag(s) {
    var m = { draft:['草稿','tag-warning'], frozen:['冻结','tag-info'], released:['发布','tag-success'], obsolete:['作废','tag-default'] };
    var t = m[s] || [s, 'tag-default'];
    return '<span class="tag ' + t[1] + '">' + t[0] + '</span>';
  },
  roleTag(r) {
    var m = { admin:['管理员','tag-danger'], engineer:['工程师','tag-blue'], production:['生产管理','tag-success'], guest:['访客','tag-default'] };
    var t = m[r] || [r, 'tag-default'];
    return '<span class="tag ' + t[1] + '">' + t[0] + '</span>';
  },
  exportCSV(data, filename, columns) {
    var header = columns.map(function(c) { return c.label; }).join(',');
    var rows = data.map(function(row) {
      return columns.map(function(c) {
        var v = typeof c.render === 'function' ? c.render(row) : (row[c.key] !== undefined ? row[c.key] : '');
        v = String(v).replace(/"/g, '""');
        return '"' + v + '"';
      }).join(',');
    });
    var csv = '\uFEFF' + header + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    Store.addLog('数据导出', '导出' + filename);
    this.toast('导出成功', 'success');
  },
  formatDate(ts) {
    if (!ts) return '-';
    var d = new Date(ts);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  },
  // 文件工具
  _fileToBase64(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) { callback(e.target.result); };
    reader.onerror = function() { callback(null); };
    reader.readAsDataURL(file);
  },
  _downloadBase64(base64, filename) {

    if (!base64) { this.toast('无附件可下载', 'warning'); return; }

    try {
      var mime = 'application/octet-stream';
      var data = base64;

      if (base64.indexOf('data:') === 0) {
        var parts = base64.split(',');
        mime = parts[0].match(/:(.*?);/)[1];
        data = parts[1];
      }

      var bstr = atob(data);
      var n = bstr.length;
      var u8arr = new Uint8Array(n);
      while (n--) { u8arr[n] = bstr.charCodeAt(n); }
      var blob = new Blob([u8arr], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || '附件';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    } catch(e) { this.toast('下载失败', 'error'); }
  },
  _formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

};
