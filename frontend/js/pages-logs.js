var Logs = {
  render: function(c) {
    // 原 Pages.logs 函数体
    var logs = Store.getAll('logs').slice().reverse();
    c.innerHTML = '<div class="page-header"><h2>📝 操作日志</h2></div><div class="card"><div class="card-body"><div class="log-list" style="max-height:600px">' +
      (logs.length === 0 ? '<p style="color:var(--text-light);text-align:center;padding:40px">暂无日志记录</p>' :
        logs.map(function(l) { return '<div class="log-item"><span class="log-time">' + UI.formatDate(l.time) + '</span><span class="log-user">' + l.user + '</span><span class="log-action">' + l.action + (l.detail ? ' - ' + l.detail : '') + '</span></div>'; }).join('')) +
      '</div></div></div>';
  }
};