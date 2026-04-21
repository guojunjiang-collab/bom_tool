var Dashboard = {
  render: function(c) {
    // 原 Pages.dashboard 函数体
    var parts = Store.getAll('parts');
    var comps = Store.getAll('components');
    var boms = Store.getAll('bom');
    var logs = Store.getAll('logs').slice(-8).reverse();
    c.innerHTML =
      '<div class="stats-row">' +
        '<div class="stat-card"><div class="stat-icon blue">🔧</div><div class="stat-info"><div class="label">零件总数</div><div class="value">' + parts.length + '</div></div></div>' +
        '<div class="stat-card"><div class="stat-icon green">📦</div><div class="stat-info"><div class="label">部件总数</div><div class="value">' + comps.length + '</div></div></div>' +
        '<div class="stat-card"><div class="stat-icon orange">📋</div><div class="stat-info"><div class="label">BOM清单</div><div class="value">' + boms.length + '</div></div></div>' +
        '<div class="stat-card"><div class="stat-icon red">🟢</div><div class="stat-info"><div class="label">可用零件</div><div class="value">' + parts.filter(function(p){return p.status==='active'}).length + '</div></div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
        '<div class="card"><div class="card-header">📋 BOM概览</div><div class="card-body">' +
          (boms.length === 0 ? '<p style="color:var(--text-light)">暂无BOM数据</p>' :
            boms.map(function(b) { return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5"><div><strong>' + b.product + '</strong> <span style="color:var(--text-light);font-size:12px">' + b.model + '</span></div><div>' + UI.statusTag(b.status) + ' <span style="color:var(--text-light);font-size:12px;margin-left:8px">' + b.version + '</span></div></div>'; }).join('')) +
        '</div></div>' +
        '<div class="card"><div class="card-header">📝 最近操作</div><div class="card-body"><div class="log-list">' +
          (logs.length === 0 ? '<p style="color:var(--text-light)">暂无日志</p>' :
            logs.map(function(l) { return '<div class="log-item"><span class="log-time">' + UI.formatDate(l.time) + '</span><span class="log-user">' + l.user + '</span><span class="log-action">' + l.action + (l.detail ? ' - ' + l.detail : '') + '</span></div>'; }).join('')) +
        '</div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-header">📊 数据统计</div><div class="card-body"><div class="bom-info-grid">' +
        '<div class="bom-info-item"><div class="label">正常零件</div><div class="value" style="color:var(--success)">' + parts.filter(function(p){return p.status==='active'}).length + '</div></div>' +
        '<div class="bom-info-item"><div class="label">禁用/作废零件</div><div class="value" style="color:var(--danger)">' + (parts.length - parts.filter(function(p){return p.status==='active'}).length) + '</div></div>' +
        '<div class="bom-info-item"><div class="label">正式BOM</div><div class="value" style="color:var(--primary)">' + boms.filter(function(b){return b.status==='formal'}).length + '</div></div>' +
        '<div class="bom-info-item"><div class="label">草稿BOM</div><div class="value" style="color:var(--warning)">' + (boms.length - boms.filter(function(b){return b.status==='formal'}).length) + '</div></div>' +
      '</div></div></div>';
  }
};