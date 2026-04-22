var Components = {

  // 主部件管理页面
  render: function(c) {

    var _kw = '';

    var _f = { status: '', sort: { field:'code', dir:'asc' } };

    function render() {

      var data = Store.getAll('components');

      if (_kw) { var k = _kw.toLowerCase(); data = data.filter(function(c2) { return c2.code.toLowerCase().indexOf(k) >= 0 || c2.name.toLowerCase().indexOf(k) >= 0; }); }

      if (_f.status) { data = data.filter(function(c2) { return c2.status === _f.status; }); }

      if (_f.sort.field) {

        data.sort(function(a, b) {

          var av = a[_f.sort.field]||'', bv = b[_f.sort.field]||'';

          if (av < bv) return _f.sort.dir === 'asc' ? -1 : 1;

          if (av > bv) return _f.sort.dir === 'asc' ? 1 : -1;

          return 0;

        });

      }

      c.innerHTML =

        '<div class="page-header"><h2>📦 部件管理</h2><div class="actions">' +

          '<button class="btn-outline" onclick="UI.csvComponents()">📥 导出Excel</button>' +

          (Auth.canEdit() ? '<button class="btn-primary" id="btn-add-cp">＋ 新增部件</button>' : '') +

        '</div></div>' +

        '<div class="card"><div class="toolbar"><div class="search-box"><input type="text" id="cs" placeholder="搜索件号/名称..." value="' + _esc(_kw) + '"></div>' +

          '<select id="cst"><option value="">全部状态</option><option value="draft"' + (_f.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="frozen"' + (_f.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (_f.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (_f.status === 'obsolete' ? ' selected' : '') + '>作废</option></select>' +

          '<div class="spacer"></div><span style="font-size:13px;color:var(--text-secondary)">共 ' + data.length + ' 条</span></div>' +

        '<div class="table-wrapper"><table id="components-table"><thead><tr><th data-sort="code" class="th-sortable">件号<span class="th-sort-icon"></span></th><th data-sort="name" class="th-sortable">名称<span class="th-sort-icon"></span></th><th data-sort="spec" class="th-sortable">规格型号<span class="th-sort-icon"></span></th><th data-sort="version" class="th-sortable">版本<span class="th-sort-icon"></span></th><th data-sort="parts" class="th-sortable">零件数<span class="th-sort-icon"></span></th><th data-sort="status" class="th-sortable">状态<span class="th-sort-icon"></span></th><th data-sort="updatedAt" class="th-sortable">更新时间<span class="th-sort-icon"></span></th><th>操作</th></tr></thead><tbody>' +

        (data.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text-light);padding:40px">暂无数据</td></tr>' :

          data.map(function(c2) { return '<tr onclick="Components._viewComp(\'' + c2.id + '\');" style="cursor:pointer"><td><strong>' + c2.code + '</strong></td><td>' + c2.name + '</td><td>' + (c2.spec||'-') + '</td><td><span class="tag" style="background:#e6f7ff;color:#1890ff;font-weight:600">' + c2.version + '</span></td><td>' + (c2.parts||[]).length + ' 种</td><td>' + UI.statusTag(c2.status) + '</td><td style="font-size:12px;color:var(--text-secondary)">' + UI.formatDate(c2.updatedAt) + '</td><td>' + (Auth.canEdit() ? '<button class="btn-text" onclick="event.stopPropagation();Components._exportBom(\'' + c2.id + '\')">导出</button><button class="btn-text" onclick="event.stopPropagation();Components._editComp(\'' + c2.id + '\')">编辑</button><button class="btn-text danger" onclick="event.stopPropagation();Components._deleteComp(\'' + c2.id + '\')">删除</button>' : '') + '</td></tr>'; }).join('')) +

        '</tbody></table></div></div>';

      var _cs = document.getElementById('cs');

      var _csSel = [_cs.selectionStart, _cs.selectionEnd];

      _cs.value = _kw;

      _cs.setSelectionRange(_csSel[0], _csSel[1]);

      var _csTimer;

      document.getElementById('cs').oninput = function(e) {

        var val = e.target.value, pos = e.target.selectionStart;

        clearTimeout(_csTimer);

        _csTimer = setTimeout(function() {

          _kw = val;

          render();

          var n = document.getElementById('cs'); if (n) { n.value = val; n.setSelectionRange(pos, pos); }

        }, 250);

      };

      document.getElementById('cst').onchange = function(e) { _f.status = e.target.value; render(); };

      document.querySelectorAll('#components-table th[data-sort]').forEach(function(th) {

        var f = th.getAttribute('data-sort');

        var ic = th.querySelector('.th-sort-icon');

        th.classList.remove('sorted');

        ic.className = 'th-sort-icon';

        if (_f.sort.field === f) {

          th.classList.add('sorted');

          ic.classList.add(_f.sort.dir);

        }

        th.onclick = function() {

          _f.page = 1;

          if (_f.sort.field === f) {

            _f.sort.dir = _f.sort.dir === 'asc' ? 'desc' : 'asc';

          } else {

            _f.sort.field = f; _f.sort.dir = 'asc';

          }

          render();

        };

      });

      var ab = document.getElementById('btn-add-cp');

      if (ab) ab.onclick = function() { Components._editComp(null); };

    }

    render();

  },



  /* ===== 部件BOM导出 ===== */

  _exportBom: function(compId) {

    var comp = Store.getById('components', compId);

    if (!comp) { UI.toast('部件不存在', 'error'); return; }

    var allParts = Store.getAll('parts');

    var allComps = Store.getAll('components');

    var statusMap = { draft:'草稿', frozen:'冻结', released:'发布', obsolete:'作废' };

    var typeMap = { component:'部件', part:'零件' };

    var rows = [];

    var collect = function(items, depth) {

      if (!items) return;

      items.forEach(function(item) {

        var childType = item.childType || 'part';

        var refId = childType === 'component' ? (item.componentId || '') : (item.partId || '');

        var info = null;

        if (childType === 'part') {

          info = allParts.find(function(p) { return p.id === refId; });

        } else {

          info = allComps.find(function(c) { return c.id === refId; });

        }

        if (!info) return;

        rows.push({

          level: depth,

          type: typeMap[childType] || childType,

          code: info.code || '',

          name: info.name || '',

          version: info.version || 'A',

          status: statusMap[info.status] || info.status || '',

          quantity: item.quantity || 1,

          spec: info.spec || '',

          material: info.material || ''

        });

        if (childType === 'component' && info.parts && info.parts.length > 0) {

          collect(info.parts, depth + 1);

        }

      });

    };

    rows.push({

      level: 0,

      type: '部件',

      code: comp.code || '',

      name: comp.name || '',

      version: comp.version || 'A',

      status: statusMap[comp.status] || comp.status || '',

      quantity: 1,

      spec: comp.spec || '',

      material: ''

    });

    if (comp.parts && comp.parts.length > 0) {

      collect(comp.parts, 1);

    }

    var headers = ['层级', '类型', '件号', '名称', '版本', '状态', '用量', '规格', '材料'];

    var csvLines = [headers.join(',')];

    rows.forEach(function(row) {

      csvLines.push([

        row.level,

        '"' + row.type + '"',

        '"' + (row.code.replace(/"/g, '""')) + '"',

        '"' + (row.name.replace(/"/g, '""')) + '"',

        row.version,

        '"' + row.status + '"',

        row.quantity,

        '"' + (row.spec.replace(/"/g, '""')) + '"',

        '"' + (row.material.replace(/"/g, '""')) + '"'

      ].join(','));

    });

    var csvContent = '\uFEFF' + csvLines.join('\r\n');

    var filename = 'BOM_' + (comp.code || 'UNKNOWN') + '_' + (comp.name || 'UNKNOWN') + '_' + (comp.version || 'A') + '.csv';

    filename = filename.replace(/[\\/:*?"<>|]/g, '_');

    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');

    a.href = url;

    a.download = filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    UI.toast('已导出 BOM：' + filename, 'success');

  },



  _viewComp: function(id) {

    var comp = Store.getById('components', id);

    if (!comp) return;

    var ap = Store.getAll('parts');

    var ac = Store.getAll('components');

    if (comp.parts && comp.parts.length > 0) {

      comp.parts.sort(function(a, b) {

        var typeA = a.childType || 'part';

        var typeB = b.childType || 'part';

        var refIdA = typeA === 'component' ? (a.componentId || '') : (a.partId || '');

        var refIdB = typeB === 'component' ? (b.componentId || '') : (b.partId || '');

        var infoA = typeA === 'part' ? ap.find(function(x) { return x.id === refIdA; }) : ac.find(function(x) { return x.id === refIdA; });

        var infoB = typeB === 'part' ? ap.find(function(x) { return x.id === refIdB; }) : ac.find(function(x) { return x.id === refIdB; });

        var codeA = (infoA && infoA.code) || '';

        var codeB = (infoB && infoB.code) || '';

        return codeA.localeCompare(codeB);

      });

    }

    var buildTree = function(items, depth, maxDepth) {

      if (!items || items.length === 0 || depth > maxDepth) return '';

      var html = '';

      items.forEach(function(p) {

        var type = p.childType || 'part';

        var refId = type === 'component' ? (p.componentId || '') : (p.partId || '');

        var info = null;

        var subItems = null;

        if (type === 'part') {

          info = ap.find(function(x) { return x.id === refId; });

        } else {

          info = ac.find(function(x) { return x.id === refId; });

          if (info && info.parts) subItems = info.parts;

        }

        if (!info) return;

        var icon = type === 'part' ? '🔧' : '📦';

        var label = type === 'part' ? '零件' : '部件';

        var indent = (depth - 1) * 20;

        var hasChildren = (type === 'component' && subItems && subItems.length > 0);

        var toggle = hasChildren ? '<span class="tree-toggle" onclick="event.stopPropagation();var c=this.closest(\'.tree-item\').nextElementSibling;c.style.display=c.style.display===\'none\'?\'block\':\'none\';this.textContent=this.textContent===\'▶\'?\'▼\':\'▶\'">▶</span> ' : '';

        html += '<div class="tree-item" style="cursor:pointer;display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid #e8e8e8;margin-left:' + indent + 'px" onclick="Components._openChildDetail(\'' + type + '\',\'' + refId + '\',\'' + comp.id + '\')"><span style="width:50px;flex-shrink:0">' + depth + '</span><span style="width:80px;flex-shrink:0">' + toggle + icon + ' ' + label + '</span><span style="flex:1">' + info.code + '</span><span style="flex:1">' + info.name + '</span><span style="flex:1">' + (info.spec || '-') + '</span><span style="width:60px;text-align:center">' + (info.version||'A') + '</span><span style="width:60px;text-align:center">' + UI.statusTag(info.status) + '</span><span style="width:60px;text-align:right">' + p.quantity + '</span></div>';

        if (hasChildren) {

          html += '<div class="tree-children" style="display:none">' + buildTree(subItems, depth + 1, maxDepth) + '</div>';

        }

      });

      return html;

    };

    var tableRows = [];

    var flattenTree = function(items, level) {

      if (!items) return;

      items.forEach(function(p) {

        var type = p.childType || 'part';

        var refId = type === 'component' ? (p.componentId || '') : (p.partId || '');

        var info = null;

        if (type === 'part') {

          info = ap.find(function(x) { return x.id === refId; });

        } else {

          info = ac.find(function(x) { return x.id === refId; });

        }

        if (!info) return;

        var icon = type === 'part' ? '🔧' : '📦';

        var label = type === 'part' ? '零件' : '部件';

        tableRows.push({ level: level, icon: icon, label: label, code: info.code, name: info.name, spec: info.spec||'-', version: info.version||'A', status: info.status, quantity: p.quantity, childType: type, refId: refId });

        if (type === 'component' && info.parts && info.parts.length > 0) {

          flattenTree(info.parts, level + 1);

        }

      });

    };

    flattenTree(comp.parts, 1);

    var tableHtml = tableRows.map(function(r) { return '<tr style="cursor:pointer" onclick="Components._openChildDetail(\'' + r.childType + '\',\'' + r.refId + '\',\'' + comp.id + '\')"><td style="padding-left:' + (r.level * 15) + 'px">' + r.level + '</td><td>' + r.icon + ' ' + r.label + '</td><td>' + r.code + '</td><td>' + r.name + '</td><td>' + r.spec + '</td><td>' + r.version + '</td><td>' + UI.statusTag(r.status) + '</td><td>' + r.quantity + '</td></tr>'; }).join('');

    var compRevs = (comp.revisions || []).slice().reverse();

    var revHtml = '<h4 style="margin:20px 0 12px">📝 修订记录 (' + compRevs.length + ')</h4>' +

      (compRevs.length > 0 ? '<div class="log-list">' + compRevs.map(function(rev) {

        var changesHtml = rev.changes.map(function(c) {

          return '<span class="rev-change"><strong>' + _esc(c.field) + '</strong>：' +

            '<span style="color:#ff4d4f;text-decoration:line-through">' + _esc(c.oldVal || '(空)') + '</span> → ' +

            '<span style="color:#52c41a">' + _esc(c.newVal || '(空)') + '</span></span>';

        }).join('&nbsp;&nbsp;');

        return '<div class="log-item" style="flex-direction:column;align-items:flex-start;gap:4px">' +

          '<div><span class="log-time">' + UI.formatDate(rev.date) + '</span><span class="log-user">' + _esc(rev.author) + '</span></div>' +

          '<div style="font-size:13px;line-height:1.6">' + changesHtml + '</div></div>';

      }).join('') + '</div>' : '<div style="padding:16px;text-align:center;color:var(--text-light);background:#fafafa;border-radius:4px">暂无修订记录</div>');

    // 加载自定义字段并渲染详情
    _loadCFDefs().then(function(cfDefs) {
      var cfValues = comp.customFields || {};
      var cfHtml = _renderCFViewHtml(cfValues, cfDefs, 'component');

    UI.modal('部件详情 - ' + comp.name,

      '<div class="form-row"><div class="form-group"><label>件号</label><input type="text" value="' + _esc(comp.code) + '" readonly></div><div class="form-group"><label>名称</label><input type="text" value="' + _esc(comp.name) + '" readonly></div></div>' +
      '<div class="form-row"><div class="form-group"><label>规格型号</label><input type="text" value="' + _esc(comp.spec||'') + '" readonly></div><div class="form-group"><label>版本</label><input type="text" value="' + (comp.version||'A') + '" readonly></div></div>' +
      '<div class="form-row"><div class="form-group"><label>状态</label>' + UI.statusTag(comp.status) + '</div><div class="form-group"><label>备注</label><input type="text" value="' + _esc(comp.remark||'') + '" readonly></div></div>' +
      cfHtml +

      '<h4 style="margin-bottom:12px">子项列表 (' + (comp.parts||[]).length + '种)</h4>' +

      '<div class="tabs" id="comp-tabs"><div class="tab active" data-t="tree">🌲 树形视图</div><div class="tab" data-t="table">📊 表格视图</div><div class="tab" data-t="attachment">📎 附件</div></div>' +

      '<div id="comp-tree-view"><div class="tree-view" style="max-height:400px;overflow-y:auto;color:#333"><div style="display:grid;grid-template-columns:50px 80px 1fr 1fr 1fr 60px 60px 60px;padding:8px 10px;background:#fafafa;font-weight:600;border-bottom:1px solid #e8e8e8"><span>层级</span><span>类型</span><span>件号</span><span>名称</span><span>规格型号</span><span>版本</span><span>状态</span><span>用量</span></div>' + buildTree(comp.parts, 1, 6) + '</div></div>' +

      '<div id="comp-table-view" style="display:none"><div class="table-wrapper" style="max-height:400px;overflow-y:auto;color:#333"><table><thead><tr><th style="width:50px;font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">层级</th><th style="width:80px;font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">类型</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">件号</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">名称</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">规格型号</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">版本</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">状态</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">用量</th></tr></thead><tbody>' + (tableHtml || '<tr><td colspan="8" style="text-align:center;color:#333">暂无数据</td></tr>') + '</tbody></table></div></div>' +

      '<div id="comp-attachment-view" style="display:none"><div class="attachment-view" style="padding:16px;background:#f9f9f9;border-radius:4px;margin-top:8px"><div class="form-row"><div class="form-group"><label>源文件</label><input type="text" value="' + _esc(comp.sourceFile||'') + '" readonly>' + (comp.sourceFile_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.sourceFile_data||'') + '\',\'' + _esc(comp.sourceFile||'附件') + '\')">⬇ 下载</button>' : '') + '</div><div class="form-group"><label>图纸</label><input type="text" value="' + _esc(comp.drawing||'') + '" readonly>' + (comp.drawing_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.drawing_data||'') + '\',\'' + _esc(comp.drawing||'附件') + '\')">⬇ 下载</button>' : '') + '</div></div><div class="form-row"><div class="form-group"><label>STP</label><input type="text" value="' + _esc(comp.stp||'') + '" readonly>' + (comp.stp_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.stp_data||'') + '\',\'' + _esc(comp.stp||'附件') + '\')">⬇ 下载</button>' : '') + '</div><div class="form-group"><label>PDF</label><input type="text" value="' + _esc(comp.pdf||'') + '" readonly>' + (comp.pdf_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.pdf_data||'') + '\',\'' + _esc(comp.pdf||'附件') + '\')">⬇ 下载</button>' : '') + '</div></div></div></div>' +

      revHtml,

      { large: true, footer: '<button class="btn-primary" id="btn-comp-detail-close" onclick="UI.closeModal()">关闭</button>' });

    document.querySelectorAll('#comp-tabs .tab').forEach(function(t) {

      t.onclick = function() {

        document.querySelectorAll('#comp-tabs .tab').forEach(function(x) { x.classList.remove('active'); });

        t.classList.add('active');

        var v = t.dataset.t;

        document.getElementById('comp-tree-view').style.display = v === 'tree' ? 'block' : 'none';

        document.getElementById('comp-table-view').style.display = v === 'table' ? 'block' : 'none';

        document.getElementById('comp-attachment-view').style.display = v === 'attachment' ? 'block' : 'none';

      };

    });

    }); // end _loadCFDefs.then

  },

  // 从部件详情打开子项详情
  _openChildDetail: function(childType, refId, parentCompId) {
    window._compDetailReturnTo = parentCompId;
    if (childType === 'part') {
      Parts._viewPart(refId);
    } else {
      Components._viewComp(refId);
    }
    // 在模态框 footer 中添加"返回"按钮，与"关闭"并排
    setTimeout(function() {
      var footer = document.querySelector('#modal-box .modal-footer');
      if (!footer) return;
      var btn = document.createElement('button');
      btn.className = 'btn-outline';
      btn.innerHTML = '← 返回部件详情';
      btn.onclick = function() {
        var pid = window._compDetailReturnTo;
        window._compDetailReturnTo = null;
        UI.closeModal();
        setTimeout(function() {
          Components._viewComp(pid);
        }, 150);
      };
      // 插入到"关闭"按钮之前
      var closeBtn = footer.querySelector('.btn-primary');
      if (closeBtn) {
        footer.insertBefore(btn, closeBtn);
      } else {
        footer.insertBefore(btn, footer.firstChild);
      }
    }, 100);
  },



  _editComp: function(id) {

    window._editCompId = id;

    var comp = id ? Store.getById('components', id) : null;

    var ap = Store.getAll('parts');

    var isNotDraft = comp && comp.status !== 'draft';

    var isFrozen = comp && comp.status === 'frozen';

    var isAdmin = Auth.getUser() && Auth.getUser().role === 'admin';

    window._editingCompStatus = comp ? comp.status : 'draft';

    window._editingCompIsAdmin = isAdmin;

    window._editingCompUserRole = Auth.getUser() ? Auth.getUser().role : null;

    var canE = isNotDraft ? (isFrozen && (isAdmin || Auth.getUser().role === 'engineer')) || (comp.status === 'released' && isAdmin) || (comp.status === 'obsolete' && isAdmin) : true;

    var ro = canE ? '' : ' readonly';

    var roExceptStatus = (isFrozen && (isAdmin || Auth.getUser().role === 'engineer')) ? '' : (canE ? '' : ' readonly');

    UI.modal(comp ? '编辑部件' : '新增部件',

      '<div class="form-row"><div class="form-group"><label>部件件号 <span class="required">*</span></label><input type="text" id="fc-code" value="' + _esc(comp ? comp.code : '') + '"' + ro + '></div><div class="form-group"><label>部件名称 <span class="required">*</span></label><input type="text" id="fc-name" value="' + _esc(comp ? comp.name : '') + '"' + ro + '></div></div>' +

      '<div class="form-group"><label>规格型号</label><input type="text" id="fc-spec" value="' + _esc(comp ? comp.spec||'' : '') + '"' + ro + '></div>' +

      '<div class="form-group"><label>状态</label><select id="fc-st"' + roExceptStatus + '><option value="draft"' + (!comp || comp.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="frozen"' + (comp && comp.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (comp && comp.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (comp && comp.status === 'obsolete' ? ' selected' : '') + '>作废</option></select></div>' +

      '<div class="form-row"><div class="form-group"><label>源文件</label>' + (comp && comp.sourceFile_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.sourceFile || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.sourceFile_data||'') + '\',\'' + _esc(comp.sourceFile||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Components._deleteCompAttachment(this,\'sourceFile\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-source" accept="*/*" onchange="Components._onCompFileChange(this,\'fc-source\')"' + ro + '></div><div class="form-group"><label>图纸</label>' + (comp && comp.drawing_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.drawing || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.drawing_data||'') + '\',\'' + _esc(comp.drawing||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Components._deleteCompAttachment(this,\'drawing\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-drawing" accept="*/*" onchange="Components._onCompFileChange(this,\'fc-drawing\')"' + ro + '></div></div>' +

      '<div class="form-row"><div class="form-group"><label>STP</label>' + (comp && comp.stp_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.stp || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.stp_data||'') + '\',\'' + _esc(comp.stp||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Components._deleteCompAttachment(this,\'stp\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-stp" accept="*/*" onchange="Components._onCompFileChange(this,\'fc-stp\')"' + ro + '></div><div class="form-group"><label>PDF</label>' + (comp && comp.pdf_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.pdf || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.pdf_data||'') + '\',\'' + _esc(comp.pdf||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Components._deleteCompAttachment(this,\'pdf\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-pdf" accept="*/*" onchange="Components._onCompFileChange(this,\'fc-pdf\')"' + ro + '></div></div>' +

      '<div class="form-group full"><label>备注</label><textarea id="fc-rem"' + ro + '>' + _esc(comp ? comp.remark||'' : '') + '</textarea></div>' +
      '<div id="cf-comp-edit-area"></div>' +
      '<h4 style="margin:8px 0 12px">子项列表</h4><div id="child-items-container">' + Components._renderChildItems(comp) + '</div>' + (canE ? '<button class="btn-outline btn-sm" id="btn-add-child">＋ 添加子项</button>' : '<div style="color:#faad14;font-size:12px;margin-top:8px">⚠️ 当前状态锁定，子项不可修改</div>') +

      (isNotDraft ? '<div style="margin-top:10px;color:#faad14;font-size:12px">⚠️ 当前状态为"' + (comp.status === 'frozen' ? '冻结' : comp.status === 'released' ? '发布' : '作废') + '"，字段已锁定。' + (isFrozen ? '管理员和工程师可修改状态。' : '仅管理员可修改状态。') + '</div>' : ''),

      { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button>' + (comp && (comp.status === 'released' || comp.status === 'obsolete') ? '<button class="btn-primary" onclick="Components._upgradeComp(\'' + comp.id + '\')">升版</button>' : '') + '<button class="btn-primary" id="btn-sc">保存</button>', large: true });

    var self = this;

    window._editCompData = JSON.parse(JSON.stringify(comp && comp.parts ? comp.parts : []));

    document.getElementById('btn-add-child').onclick = function() { Components._showChildSelector(id); };

    // 加载自定义字段编辑区
    _loadCFDefs().then(function(cfDefs) {
      var cfArea = document.getElementById('cf-comp-edit-area');
      if (!cfArea) return;
      var cfValues = comp ? (comp.customFields || {}) : {};
      cfArea.innerHTML = _renderCFEditHtml(cfValues, cfDefs, 'component', ro);
    });

    document.getElementById('btn-sc').onclick = function() {

      var code = document.getElementById('fc-code').value.trim();

      var name = document.getElementById('fc-name').value.trim();

      if (!code || !name) { UI.toast('件号和名称为必填项', 'warning'); return; }

      var dup = Store.getAll('components').find(function(c2) { return c2.code === code && c2.version === (comp ? comp.version : 'A') && (!comp || c2.id !== comp.id); });

      if (dup) { UI.toast('该件号+版本组合已存在', 'error'); return; }

      if (comp && !canE) { UI.alert('您没有权限编辑此部件'); return; }

      var rawItems = window._editCompData || [];

      var parts = rawItems.map(function(item) {

        if (item.partId !== undefined && item.childType === undefined) return item;

        if (item.childType === 'component') {

          return { childType: 'component', componentId: item.componentId || '', quantity: item.quantity || 1 };

        } else {

          return { childType: 'part', partId: item.partId || '', quantity: item.quantity || 1 };

        }

      }).filter(function(p) { return p.partId || p.componentId; });

      var newV = comp ? comp.version : 'A';

      var files = ['fc-source','fc-drawing','fc-stp','fc-pdf'];

      var fileKeys = ['sourceFile','drawing','stp','pdf'];

      var pending = files.length;

      var results = {};

      var done = function() {

        pending--;

        if (pending > 0) return;

        var data = {

          code:code, name:name,

          spec:document.getElementById('fc-spec').value.trim(),

          status:document.getElementById('fc-st').value,

          remark:document.getElementById('fc-rem').value.trim(),

          parts:parts,

          version:newV

        };

        fileKeys.forEach(function(k) {

          var r = results[k];

          if (r) {

            data[k] = r.name;

            data[k + '_data'] = r.data;

          } else {

            data[k] = comp ? (comp[k] || '') : '';

            data[k + '_data'] = comp ? (comp[k + '_data'] || '') : '';

          }

        });

        if (comp) {

          var _compFieldLabels = { code:'件号', name:'名称', spec:'规格型号', status:'状态', remark:'备注', sourceFile:'源文件', drawing:'图纸', stp:'STP', pdf:'PDF' };

          var _compTrackFields = ['code','name','spec','status','remark','sourceFile','drawing','stp','pdf'];

          var _compChanges = [];

          _compTrackFields.forEach(function(f) {

            var oldVal = (comp[f] || '').toString();

            var newVal = (data[f] || '').toString();

            if (oldVal !== newVal) {

              _compChanges.push({ field: _compFieldLabels[f] || f, oldVal: oldVal, newVal: newVal });

            }

          });

          var _compFileDataKeys = ['sourceFile','drawing','stp','pdf'];

          _compFileDataKeys.forEach(function(f) {

            var oldData = comp[f + '_data'] || '';

            var newData = data[f + '_data'] || '';

            if (oldData !== newData && !_compChanges.find(function(c) { return c.field === (_compFieldLabels[f] || f); })) {

              _compChanges.push({ field: _compFieldLabels[f] || f, oldVal: oldData ? '有文件' : '无', newVal: newData ? '有文件' : '无' });

            }

          });

          var oldPartsJson = JSON.stringify(comp.parts || []);

          var newPartsJson = JSON.stringify(data.parts || []);

          if (oldPartsJson !== newPartsJson) {

            _compChanges.push({ field: '子项列表', oldVal: (comp.parts||[]).length + '项', newVal: (data.parts||[]).length + '项' });

          }

          if (_compChanges.length > 0) {

            var compRevisions = comp.revisions || [];

            compRevisions.push({ date: Date.now(), author: Auth.getUser() ? Auth.getUser().realName : '未知', changes: _compChanges });

            data.revisions = compRevisions;

          }

          Store.update('components', id, data); Store.addLog('编辑部件', '修改部件 ' + code);
          // 保存自定义字段值
          var cfDefsForSave = Store.getAll('custom_field_defs');
          var cfVals = _collectCFValues(cfDefsForSave, 'component');
          Store.update('components', id, { customFields: cfVals }, { skipSync: true });
          _saveCFValues('component', id, cfVals, cfDefsForSave);
          UI.toast('部件更新成功', 'success');

        } else {

          data.revisions = [];

          Store.add('components', data); Store.addLog('新增部件', '新增部件 ' + code + ' - ' + name);
          // 新增部件后保存自定义字段值
          var cfDefsForSave2 = Store.getAll('custom_field_defs');
          var cfVals2 = _collectCFValues(cfDefsForSave2, 'component');
          if (Object.keys(cfVals2).length > 0) {
            data.customFields = cfVals2;
            Store.update('components', data.id, { customFields: cfVals2 }, { skipSync: true });
            _saveCFValues('component', data.id, cfVals2, cfDefsForSave2);
          }
          UI.toast('部件新增成功', 'success');

        }

        window._editCompData = null;

        UI.closeModal(); Router.render();

      };

      files.forEach(function(fid, i) {

        var el = document.getElementById(fid);

        if (el && el.files && el.files[0]) {

          UI._fileToBase64(el.files[0], function(base64) {

            results[fileKeys[i]] = base64 ? { name: el.files[0].name, data: base64 } : null;

            done();

          });

        } else {

          results[fileKeys[i]] = null;

          done();

        }

      });

    };

  },



  _renderChildItems: function(comp) {

    var items = (window._editCompData && window._editCompData.length > 0)

      ? window._editCompData

      : (comp && comp.parts ? comp.parts : []);

    if (items.length === 0) {

      return '<p style="color:var(--text-light);font-size:13px;padding:8px 0">暂无子项，请点击"添加子项"添加</p>';

    }

    var ap = Store.getAll('parts');

    var ac = Store.getAll('components');

    var user = Auth.getUser();

    var isAdmin = user && user.role === 'admin';

    var compStatus = comp ? comp.status : 'draft';

    var isReleasedOrObsolete = compStatus === 'released' || compStatus === 'obsolete';

    var readOnly = isReleasedOrObsolete && !isAdmin;

    var html = '<table style="margin-bottom:8px"><thead><tr><th>类型</th><th>件号</th><th>名称</th><th>版本</th><th>状态</th><th>用量</th><th></th></tr></thead><tbody>';

    items.forEach(function(item, idx) {

      var type = item.childType || 'part';

      var refId = item.partId || item.componentId || '';

      var info = null;

      if (type === 'part') {

        info = ap.find(function(p) { return p.id === refId; });

      } else if (type === 'component') {

        info = ac.find(function(c) { return c.id === refId; });

      }

      if (!info) return;

      var icon = type === 'part' ? '🔧' : '📦';

      var typeLabel = type === 'part' ? '零件' : '部件';

      var inputAttr = readOnly ? ' readonly onclick="UI.alert(\'发布/作废状态的子项仅管理员可修改\')"' : ' onchange="Components._updateChildItem(' + idx + ', \'quantity\', this.value)"';

      var buttonHtml = readOnly

        ? '<button class="btn-text danger btn-sm" onclick="UI.alert(\'发布/作废状态的子项仅管理员可移除\')">移除</button>'

        : '<button class="btn-text danger btn-sm" onclick="Components._removeChildItem(' + idx + ')">移除</button>';

      html += '<tr>' +

        '<td>' + icon + ' ' + typeLabel + '</td>' +

        '<td>' + info.code + '</td>' +

        '<td>' + info.name + '</td>' +

        '<td style="font-size:12px;color:#888">' + (info.version || 'A') + '</td>' +

        '<td>' + UI.statusTag(info.status) + '</td>' +

        '<td><input type="number" value="' + (item.quantity || 1) + '" min="1" style="width:60px"' + inputAttr + '></td>' +

        '<td>' + buttonHtml + '</td>' +

        '</tr>';

    });

    html += '</tbody></table>';

    return html;

  },



  _updateChildItem: function(idx, field, value) {

    if (!window._editCompData) return;

    if (window._editingCompStatus && (window._editingCompStatus === 'released' || window._editingCompStatus === 'obsolete') && !window._editingCompIsAdmin) {

        UI.alert('发布/作废状态的子项仅管理员可修改');

        return;

    }

    if (field === 'quantity') {

      window._editCompData[idx].quantity = parseInt(value) || 1;

    }

  },



  _removeChildItem: function(idx) {

    if (!window._editCompData) return;

    if (window._editingCompStatus && (window._editingCompStatus === 'released' || window._editingCompStatus === 'obsolete') && !window._editingCompIsAdmin) {

        UI.alert('发布/作废状态的子项仅管理员可移除');

        return;

    }

    window._editCompData.splice(idx, 1);

    if (typeof window._refreshChildSelector === 'function') {

      window._refreshChildSelector();

    } else {

      var container = document.getElementById('child-items-container');

      if (container) {

        container.innerHTML = Components._renderChildItems(null);

      }

    }

  },



  _showChildSelector: function(compId) {

    var ap = Store.getAll('parts');

    var ac = Store.getAll('components');

    if (compId) {

      ac = ac.filter(function(c) { return c.id !== compId; });

    }

    var currentIds = (window._editCompData || []).map(function(item) {

      return item.partId || item.componentId || '';

    });

    var filteredParts = ap.filter(function(p) { return currentIds.indexOf(p.id) < 0; });

    var filteredComps = ac.filter(function(c) { return currentIds.indexOf(c.id) < 0; });

    window._childSelectorState = {

      filteredParts: filteredParts,

      filteredComps: filteredComps

    };

    function renderSelectorChildItems() {

      var container = document.getElementById('cs-child-items');

      if (!container) return;

      var items = window._editCompData || [];

      var ap = Store.getAll('parts');

      var ac = Store.getAll('components');

      if (items.length === 0) {

        container.innerHTML = '<p style="color:#999;font-size:12px;padding:4px 0">暂无已选子项</p>';

        return;

      }

      var h = '<table style="table-layout:fixed;width:100%;margin-bottom:4px"><thead><tr style="background:#f8f8f8"><th style="width:70px;text-align:left;padding:4px 6px;font-size:11px;color:#888">类型</th><th style="width:100px;text-align:left;padding:4px 6px;font-size:11px;color:#888">件号</th><th style="text-align:left;padding:4px 6px;font-size:11px;color:#888">名称</th><th style="width:60px;text-align:left;padding:4px 6px;font-size:11px;color:#888">版本</th><th style="width:60px;text-align:left;padding:4px 6px;font-size:11px;color:#888">状态</th><th style="width:50px;text-align:center;padding:4px 6px;font-size:11px;color:#888">用量</th><th style="width:40px"></th></tr></thead><tbody>';

      items.forEach(function(item, idx) {

        var type = item.childType || 'part';

        var refId = item.partId || item.componentId || '';

        var info = null;

        if (type === 'part') {

          info = ap.find(function(p) { return p.id === refId; });

        } else {

          info = ac.find(function(c) { return c.id === refId; });

        }

        if (!info) return;

        var icon = type === 'part' ? '🔧' : '📦';

        var label = type === 'part' ? '零件' : '部件';

        h += '<tr style="border-bottom:1px solid #f0f0f0">';

        h += '<td style="padding:4px 6px;font-size:12px"><span style="font-size:11px;color:#888">' + icon + ' ' + label + '</span></td>';

        h += '<td style="padding:4px 6px;font-size:12px">' + (info.code||'') + '</td>';

        h += '<td style="padding:4px 6px;font-size:12px">' + (info.name||'') + '</td>';

        h += '<td style="padding:4px 6px;font-size:12px;color:#888">' + (info.version || 'A') + '</td>';

        h += '<td style="padding:4px 6px;font-size:12px">' + UI.statusTag(info.status) + '</td>';

        h += '<td style="text-align:center;padding:2px 4px"><input type="number" value="' + (item.quantity||1) + '" min="1" style="width:40px;font-size:12px;padding:2px 4px" onchange="Components._updateChildItem(' + idx + ',\'quantity\',this.value)"></td>';

        h += '<td style="text-align:center"><button class="btn-text danger" style="font-size:12px;padding:2px 4px" onclick="Components._removeChildItem(' + idx + ')">×</button></td>';

        h += '</tr>';

      });

      h += '</tbody></table>';

      container.innerHTML = h;

    }

    var overlay = document.createElement('div');

    overlay.id = 'child-selector-overlay';

    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s';

    overlay.innerHTML =

      '<div style="background:#fff;border-radius:8px;width:820px;max-width:90vw;max-height:88vh;display:flex;flex-direction:column;animation:slideUp .2s;overflow:hidden">' +

      '<div style="padding:14px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +

      '<span style="font-size:15px;font-weight:600">添加子项</span>' +

      '<button id="cs-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;line-height:1;padding:0 4px">&times;</button>' +

      '</div>' +

      '<div style="padding:14px 20px 10px;flex-shrink:0">' +

      '<div style="font-size:12px;color:#666;margin-bottom:8px">已选子项</div>' +

      '<div id="cs-child-items" style="max-height:140px;overflow-y:auto;border:1px solid #e8e8e8;border-radius:6px;padding:8px 10px"></div>' +

      '</div>' +

      '<div style="padding:0 20px 14px;flex-shrink:0;display:flex;gap:8px">' +

      '<input type="text" id="cs-kw" placeholder="搜索编码、名称或规格..." style="flex:1;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px">' +

      '<select id="cs-type" style="width:110px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px"><option value="all">全部</option><option value="part">零件</option><option value="component">部件</option></select>' +

      '</div>' +

      '<div id="cs-results" style="flex:1;overflow-y:auto;margin:0 20px 16px;border:1px solid #e8e8e8;border-radius:6px;min-height:120px"></div>' +

      '</div>';

    document.body.appendChild(overlay);

    renderSelectorChildItems();

    document.getElementById('cs-close').onclick = function() {

      overlay.remove();

      var mainContainer = document.getElementById('child-items-container');

      if (mainContainer) {

        mainContainer.innerHTML = Components._renderChildItems(null);

      }

      window._childSelectorState = null;

    };

    overlay.onclick = function(e) {

      if (e.target === overlay) {

        overlay.remove();

        var mainContainer = document.getElementById('child-items-container');

        if (mainContainer) {

          mainContainer.innerHTML = Components._renderChildItems(null);

        }

        window._childSelectorState = null;

      }

    };

    function renderResults(keyword, type) {

      var kw = keyword.toLowerCase();

      var results = [];

      var sp = window._childSelectorState ? window._childSelectorState.filteredParts : [];

      var sc = window._childSelectorState ? window._childSelectorState.filteredComps : [];

      if (type === 'all' || type === 'part') {

        sp.forEach(function(p) {

          if (!kw || p.code.toLowerCase().indexOf(kw) >= 0 || p.name.toLowerCase().indexOf(kw) >= 0 || (p.spec||'').toLowerCase().indexOf(kw) >= 0) {

            results.push({ type: 'part', data: p });

          }

        });

      }

      if (type === 'all' || type === 'component') {

        sc.forEach(function(c) {

          if (!kw || c.code.toLowerCase().indexOf(kw) >= 0 || c.name.toLowerCase().indexOf(kw) >= 0) {

            results.push({ type: 'component', data: c });

          }

        });

      }

      var container = document.getElementById('cs-results');

      if (!container) return;

      if (results.length === 0) {

        container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:13px">未找到匹配的零件或部件</div>';

        return;

      }

      var html2 = '<table style="table-layout:fixed;width:100%"><thead><tr style="background:#f8f8f8"><th style="width:80px;text-align:left;padding:6px 10px;font-size:12px;color:#888">类型</th><th style="width:110px;text-align:left;padding:6px 10px;font-size:12px;color:#888">件号</th><th style="text-align:left;padding:6px 10px;font-size:12px;color:#888">名称</th><th style="width:80px;text-align:left;padding:6px 10px;font-size:12px;color:#888">版本</th><th style="width:70px;text-align:left;padding:6px 10px;font-size:12px;color:#888">状态</th><th style="width:70px;text-align:center;padding:6px 10px;font-size:12px;color:#888">操作</th></tr></thead><tbody>';

      results.forEach(function(item) {

        var d = item.data;

        var icon = item.type === 'part' ? '🔧' : '📦';

        var typeLabel = item.type === 'part' ? '零件' : '部件';

        html2 += '<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:7px 10px;font-size:13px"><span style="font-size:12px;color:#888">' + icon + ' ' + typeLabel + '</span></td><td style="padding:7px 10px;font-size:13px">' + d.code + '</td><td style="padding:7px 10px;font-size:13px">' + d.name + '</td><td style="padding:7px 10px;font-size:13px;color:#888">' + (d.version || 'A') + '</td><td style="padding:7px 10px;font-size:13px">' + UI.statusTag(d.status) + '</td><td style="text-align:center;padding:7px 10px"><button class="btn-primary btn-sm" onclick="Components._addChildItem(\'' + item.type + '\',\'' + d.id + '\')">添加</button></td></tr>';

      });

      html2 += '</tbody></table>';

      container.innerHTML = html2;

    }

    window._refreshChildSelector = function() {

      var kw = document.getElementById('cs-kw') ? document.getElementById('cs-kw').value : '';

      var tf = document.getElementById('cs-type') ? document.getElementById('cs-type').value : 'all';

      renderResults(kw, tf);

      renderSelectorChildItems();

      var mainContainer = document.getElementById('child-items-container');

      if (mainContainer) {

        mainContainer.innerHTML = Components._renderChildItems(null);

      }

    };

    document.getElementById('cs-kw').oninput = function() { renderResults(this.value, document.getElementById('cs-type').value); };

    document.getElementById('cs-type').onchange = function() { renderResults(document.getElementById('cs-kw').value, this.value); };

    renderResults('', 'all');

  },



  _addChildItem: function(type, refId) {

    if (!window._editCompData) window._editCompData = [];

    var exists = window._editCompData.some(function(item) {

      return (type === 'part' && item.partId === refId) ||

             (type === 'component' && item.componentId === refId);

    });

    if (exists) { UI.toast('该子项已添加', 'warning'); return; }

    window._editCompData.push({

      childType: type,

      partId: type === 'part' ? refId : null,

      componentId: type === 'component' ? refId : null,

      quantity: 1

    });

    UI.toast('已添加子项', 'success');

    var state = window._childSelectorState;

    if (state) {

      if (type === 'part') {

        state.filteredParts = state.filteredParts.filter(function(p) { return p.id !== refId; });

      } else {

        state.filteredComps = state.filteredComps.filter(function(c) { return c.id !== refId; });

      }

    }

    if (typeof window._refreshChildSelector === 'function') {

      window._refreshChildSelector();

    }

  },



  _deleteComp: function(id) {

    var comp = Store.getById('components', id);

    if (!comp) return;

    var isAdmin = Auth.getUser() && Auth.getUser().role === 'admin';

    if ((comp.status === 'released' || comp.status === 'obsolete') && !isAdmin) { UI.alert('"发布"和"作废"状态的部件仅管理员可删除'); return; }

    var parentComps = [];

    var allComps = Store.getAll('components') || [];

    for (var i = 0; i < allComps.length; i++) {

      var c = allComps[i];

      if (c.parts && c.parts.length > 0) {

        for (var j = 0; j < c.parts.length; j++) {

          var p = c.parts[j];

          if (p.childType === 'component' && p.componentId === id && c.id !== id) { parentComps.push(c); break; }

        }

      }

    }

    if (parentComps.length > 0) {

      UI.alert('该部件被引用，不能被删除');

      return;

    }

    var allBoms = Store.getAll('boms') || [];

    var parentBoms = [];

    var findParents = function(nodes) {

      if (!nodes || !Array.isArray(nodes)) return;

      for (var i = 0; i < nodes.length; i++) {

        var node = nodes[i];

        if (node.componentId === id) { parentBoms.push({ code: node.code || node.name || 'BOM节点', name: node.name || '' }); }

        if (node.children) findParents(node.children);

      }

    };

    for (var bi = 0; bi < allBoms.length; bi++) { findParents(allBoms[bi].tree); }

    if (parentBoms.length > 0) {

      UI.alert('该部件被引用，不能被删除');

      return;

    }

    var allComps2 = Store.getAll('components');

    var newerVersions = allComps2.filter(function(c) {

        return c.code === comp.code && c.id !== id && (c.version || 'A').charCodeAt(0) > (comp.version || 'A').charCodeAt(0);

    });

    if (newerVersions.length > 0) {

        UI.alert('该部件不是最新版本，不能被删除');

        return;

    }

    UI.confirm('确定要删除部件 <strong>' + comp.code + ' - ' + comp.name + '</strong> 吗？', function() {

      Store.remove('components', id);

      Store.addLog('删除部件', '删除部件 ' + comp.code);

      UI.toast('删除成功（待同步）', 'success');

      Router.render();

    });

  },



  _upgradeComp: function(id) {

    try {

    var oldComp = Store.getById('components', id);

    if (!oldComp) { console.error('部件不存在:', id); UI.toast('部件不存在', 'error'); return; }

    if (oldComp.status !== 'released' && oldComp.status !== 'obsolete') { UI.toast('只有"发布"或"作废"状态的部件可以升版', 'warning'); return; }

    var allComps = Store.getAll('components').filter(function(c) { return c.code === oldComp.code; });

    var maxV = allComps.reduce(function(max, c) { var v = c.version || 'A'; var cv = v.charCodeAt(0); return cv > max ? cv : max; }, 0);

    if ((oldComp.version || 'A').charCodeAt(0) < maxV) { UI.alert('该部件存在更新版本，不能重复升版'); return; }

    var v = oldComp.version || 'A';

    var newV = String.fromCharCode(v.charCodeAt(0) + 1);

    if (newV > 'Z') { UI.toast('版本号已超过Z，不再支持升版', 'error'); return; }

    var newComp = JSON.parse(JSON.stringify(oldComp));

    newComp.id = _uuid();

    newComp.version = newV;

    newComp.status = 'draft';

    newComp.createdAt = Date.now();

    newComp.updatedAt = Date.now();

    var compRevisions = oldComp.revisions || [];

    compRevisions.push({ date: Date.now(), author: (Auth.getUser() ? Auth.getUser().realName : '未知'), changes: [{ field: '版本', oldVal: oldComp.version, newVal: newV }] });

    oldComp.revisions = compRevisions;

    newComp.revisions = [];

    Store.update('components', id, oldComp);

    Store.add('components', newComp);

    Store.addLog('部件升版', '部件 ' + oldComp.code + ' 从版本' + oldComp.version + ' 升版至 ' + newV);

    UI.toast('升版成功，新版本: ' + newV, 'success');

    UI.closeModal();

    Router.render();

    } catch(e) { console.error('升版错误:', e); UI.toast('升版失败: ' + e.message, 'error'); }

  }
};

