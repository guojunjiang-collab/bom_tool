var Parts = {
  // 主零件管理页面
  render: function(c) {
    var _f = { keyword:'', status:'', page:1, size:15, sort:{field:'code', dir:'asc'} };
    function render() {
      var data = Store.getAll('parts');
      // 处理材质可能是对象的情况
      if (_f.keyword) { var kw = _f.keyword.toLowerCase(); data = data.filter(function(p) { return p.code.toLowerCase().indexOf(kw) >= 0 || p.name.toLowerCase().indexOf(kw) >= 0 || p.spec.toLowerCase().indexOf(kw) >= 0; }); }
      if (_f.status) data = data.filter(function(p) { return p.status === _f.status; });
      if (_f.sort.field) {
        data.sort(function(a, b) {
          var av = a[_f.sort.field]||'', bv = b[_f.sort.field]||'';
          if (av < bv) return _f.sort.dir === 'asc' ? -1 : 1;
          if (av > bv) return _f.sort.dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      var total = data.length;
      var tp = Math.max(1, Math.ceil(total / _f.size));
      _f.page = Math.min(_f.page, tp);
      var start = (_f.page - 1) * _f.size;
      var pd = data.slice(start, start + _f.size);
      var canE = Auth.canEdit();
      c.innerHTML =
        '<div class="page-header"><h2>🔧 零件管理</h2><div class="actions">' +
          '<button class="btn-outline" onclick="Parts._exportParts()">📥 导出Excel</button>' +
          (canE ? '<button class="btn-primary" id="btn-add-part">＋ 新增零件</button>' : '') +
        '</div></div>' +
        '<div class="card"><div class="toolbar">' +
          '<div class="search-box"><input type="text" id="ps" placeholder="搜索件号/名称/规格..." value="' + _esc(_f.keyword) + '"></div>' +
          '<select id="pst"><option value="">全部状态</option><option value="draft"' + (_f.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="frozen"' + (_f.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (_f.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (_f.status === 'obsolete' ? ' selected' : '') + '>作废</option></select>' +
          '<div class="spacer"></div><span style="font-size:13px;color:var(--text-secondary)">共 ' + total + ' 条</span>' +
        '</div><div class="table-wrapper"><table id="parts-table"><thead><tr><th data-sort="code" class="th-sortable">件号<span class="th-sort-icon"></span></th><th data-sort="name" class="th-sortable">名称<span class="th-sort-icon"></span></th><th data-sort="spec" class="th-sortable">规格型号<span class="th-sort-icon"></span></th><th data-sort="version" class="th-sortable">版本<span class="th-sort-icon"></span></th><th>材料</th><th data-sort="status" class="th-sortable">状态<span class="th-sort-icon"></span></th><th>操作</th></tr></thead><tbody>' +
        (pd.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:40px)">暂无数据</td></tr>' :
          pd.map(function(p) {
            return '<tr onclick="Parts._viewPart(\'' + p.id + '\');" style="cursor:pointer"><td>' + p.code + '</td><td>' + p.name + '</td><td>' + _esc(p.spec||'') + '</td><td><span class="tag" style="background:#e6f7ff;color:#1890ff;font-weight:600">' + (p.version||'A') + '</span></td><td>' + _esc(p.material||'') + '</td><td>' + UI.statusTag(p.status) + '</td><td>' + (canE ? '<button class="btn-text" onclick="event.stopPropagation();Parts._editPart(\'' + p.id + '\')">编辑</button><button class="btn-text danger" onclick="event.stopPropagation();Parts._deletePart(\'' + p.id + '\')">删除</button>' : '<span style="color:var(--text-light);font-size:12px">只读</span>') + '</td></tr>';
          }).join('')) +
        '</tbody></table></div></div>';
      var _psTimer;
      document.getElementById('ps').oninput = function(e) {
        var val = e.target.value, pos = e.target.selectionStart;
        clearTimeout(_psTimer);
        _psTimer = setTimeout(function() {
          _f.keyword = val; _f.page = 1;
          render();
          var n = document.getElementById('ps'); if (n) { n.value = val; n.setSelectionRange(pos, pos); }
        }, 250);
      };
      document.getElementById('pst').onchange = function(e) { _f.status = e.target.value; _f.page = 1; render(); };
      // 排序角标 & 点击事件
      document.querySelectorAll('#parts-table th[data-sort]').forEach(function(th) {
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
      var ab = document.getElementById('btn-add-part');
      if (ab) ab.onclick = function() { Parts._editPart(null); };
    }
    render();
  },

  // 导出零件清单
  _exportParts: function() {
    UI.exportCSV(Store.getAll('parts'), '零件清单.csv', [
      {key:'code',label:'件号'},{key:'name',label:'名称'},{key:'spec',label:'规格'},
      {key:'version',label:'版本'},{key:'status',label:'状态'}
    ]);
  },

  // 编辑零件（新增/修改）
  _editPart: function(id) {
    window._editPartId = id;
    var part = id ? Store.getById('parts', id) : null;
    var isNotDraft = part && part.status !== 'draft';
    var isFrozen = part && part.status === 'frozen';
    var user = Auth.getUser();
    var isAdmin = user && user.role === 'admin';
    var userRole = user ? user.role : null;
    var canE = isNotDraft ? (isFrozen && (isAdmin || userRole === 'engineer')) || (part.status === 'released' && isAdmin) || (part.status === 'obsolete' && isAdmin) : true;
    var ro = canE ? '' : ' readonly';
    var roExceptStatus = (isFrozen && (isAdmin || userRole === 'engineer')) ? '' : (canE ? '' : ' readonly');
    UI.modal(part ? '编辑零件' : '新增零件',
      '<div class="form-row"><div class="form-group"><label>零件件号 <span class="required">*</span></label><input type="text" id="fp-code" value="' + (part ? part.code : '') + '" placeholder="如 PT-021"' + ro + '></div><div class="form-group"><label>零件名称 <span class="required">*</span></label><input type="text" id="fp-name" value="' + (part ? part.name : '') + '" placeholder="如 M12螺栓"' + ro + '></div></div>' +
      '<div class="form-row"><div class="form-group"><label>规格型号</label><input type="text" id="fp-spec" value="' + _esc(part ? part.spec : '') + '"' + ro + '></div><div class="form-group"><label>材料</label><select id="fp-material"' + ro + '><option value="">— 无 —</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>版本</label><input type="text" id="fp-version" value="' + (part ? part.version || 'A' : 'A') + '" readonly></div><div class="form-group"><label>状态</label><select id="fp-st"' + roExceptStatus + '><option value="draft"' + (!part || part.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="frozen"' + (part && part.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (part && part.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (part && part.status === 'obsolete' ? ' selected' : '') + '>作废</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>源文件</label>' + (part && part.sourceFile_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.sourceFile || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.sourceFile_data||'') + '\',\'' + _esc(part.sourceFile||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deletePartAttachment(this,\'sourceFile\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-source" accept="*/*" onchange="Parts._onFileChange(this,\'fp-source\')"' + ro + '></div><div class="form-group"><label>图纸</label>' + (part && part.drawing_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.drawing || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.drawing_data||'') + '\',\'' + _esc(part.drawing||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deletePartAttachment(this,\'drawing\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-drawing" accept="*/*" onchange="Parts._onFileChange(this,\'fp-drawing\')"' + ro + '></div></div>' +
      '<div class="form-row"><div class="form-group"><label>STP</label>' + (part && part.stp_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.stp || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.stp_data||'') + '\',\'' + _esc(part.stp||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deletePartAttachment(this,\'stp\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-stp" accept="*/*" onchange="Parts._onFileChange(this,\'fp-stp\')"' + ro + '></div><div class="form-group"><label>PDF</label>' + (part && part.pdf_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.pdf || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.pdf_data||'') + '\',\'' + _esc(part.pdf||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deletePartAttachment(this,\'pdf\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-pdf" accept="*/*" onchange="Parts._onFileChange(this,\'fp-pdf\')"' + ro + '></div></div>' +
      '<div class="form-group full"><label>备注</label><textarea id="fp-rem"' + ro + '>' + (part ? _esc(part.remark||'') : '') + '</textarea></div>' +
      (isNotDraft ? '<div style="margin-top:10px;color:#faad14;font-size:12px">⚠️ 当前状态为"' + (part.status === 'frozen' ? '冻结' : part.status === 'released' ? '发布' : '作废') + '"，字段已锁定。' + (isFrozen ? '管理员和工程师可修改状态。' : '仅管理员可修改状态。') + '</div>' : ''),
      { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button>' + (part && (part.status === 'released' || part.status === 'obsolete') ? '<button class="btn-primary" onclick="Parts._upgradePart(\'' + part.id + '\')">升版</button>' : '') + '<button class="btn-primary" id="btn-sp">保存</button>', large: true,
        afterRender: function() {
          // 打开时立即填充材质下拉框
          var sel = document.getElementById('fp-material');
          if (!sel) return;
          var mats = Store.getAll('dict_materials');
          var curId = part && part.material_id ? part.material_id : '';
          mats.forEach(function(m) {
            var opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.value;
            if (m.id === curId) opt.selected = true;
            sel.appendChild(opt);
          });
        }
      });
    document.getElementById('btn-sp').onclick = function() {
      var code = document.getElementById('fp-code').value.trim();
      var name = document.getElementById('fp-name').value.trim();
      if (!code || !name) { UI.toast('件号和名称为必填项', 'warning'); return; }
      var dup = Store.getAll('parts').find(function(p) { return p.code === code && p.version === (part ? part.version : 'A') && (!part || p.id !== part.id); });
      if (dup) { UI.toast('该件号+版本组合已存在', 'error'); return; }
      var user = Auth.getUser();
      var isAdmin = user && user.role === 'admin';
      var isDraft = !part || part.status === 'draft';
      if (!isDraft && !isAdmin) {
        if (!isFrozen || userRole !== 'engineer') {
            UI.alert('只有"草稿"状态的零件可编辑，或管理员权限');
            return;
        }
      }
      var newV = part ? part.version : 'A';
      var files = ['fp-source','fp-drawing','fp-stp','fp-pdf'];
      var fileKeys = ['sourceFile','drawing','stp','pdf'];
      var pending = files.length;
      var results = {};
      var done = function() {
        pending--;
        if (pending > 0) return;
        var data = {
          code:code, name:name,
          spec:document.getElementById('fp-spec').value.trim(),
          material_id:document.getElementById('fp-material').value || null,
          version:newV,
          status:document.getElementById('fp-st').value,
          remark:document.getElementById('fp-rem').value.trim()
        };
        fileKeys.forEach(function(k) {
          var r = results[k];
          if (r) {
            data[k] = r.name;
            data[k + '_data'] = r.data;
          } else {
            data[k] = part ? (part[k] || '') : '';
            data[k + '_data'] = part ? (part[k + '_data'] || '') : '';
          }
        });
        if (part) {
          // 生成修订记录：对比修改前后的字段
          var _fieldLabels = { code:'件号', name:'名称', spec:'规格型号', material_id:'材料', status:'状态', remark:'备注', sourceFile:'源文件', drawing:'图纸', stp:'STP', pdf:'PDF' };
          var _trackFields = ['code','name','spec','material_id','status','remark','sourceFile','drawing','stp','pdf'];
          var _changes = [];
          var _matDict = Store.getAll('dict_materials');
          var _getMatName = function(id) {
            if (!id) return '(无)';
            var m = _matDict.find(function(x) { return x.id === id; });
            return m ? m.value : id;
          };
          _trackFields.forEach(function(f) {
            var oldVal = (part[f] || '').toString();
            var newVal = (data[f] || '').toString();
            if (oldVal !== newVal) {
              _changes.push({
                field: _fieldLabels[f] || f,
                oldVal: (f === 'material_id' ? _getMatName(part.material_id) : oldVal) || '(无)',
                newVal: (f === 'material_id' ? _getMatName(data.material_id) : newVal) || '(无)'
              });
            }
          });
          // 文件数据变更（上传新文件或删除文件）
          var _fileDataKeys = ['sourceFile','drawing','stp','pdf'];
          _fileDataKeys.forEach(function(f) {
            var oldData = part[f + '_data'] || '';
            var newData = data[f + '_data'] || '';
            if (oldData !== newData && !_changes.find(function(c) { return c.field === (_fieldLabels[f] || f); })) {
              _changes.push({ field: _fieldLabels[f] || f, oldVal: oldData ? '有文件' : '无', newVal: newData ? '有文件' : '无' });
            }
          });
          if (_changes.length > 0) {
            var revisions = part.revisions || [];
            revisions.push({
              date: Date.now(),
              author: Auth.getUser() ? Auth.getUser().realName : '未知',
              changes: _changes
            });
            data.revisions = revisions;
          }
          Store.update('parts', id, data);
          Store.addLog('编辑零件', '修改零件 ' + code);
          UI.toast('零件更新成功', 'success');
        } else {
          data.revisions = [];
          Store.add('parts', data);
          Store.addLog('新增零件', '新增零件 ' + code + ' - ' + name);
          UI.toast('零件新增成功', 'success');
        }
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

  // 零件编辑：文件选择后更新预览区
  _onFileChange: function(el, prefix) {
    var file = el.files[0];
    if (!file) return;
    var preview = el.parentElement.querySelector('.file-preview');
    if (!preview) return;
    var size = UI._formatFileSize(file.size);
    var name = file.name;
    UI._fileToBase64(file, function(base64) {
      preview.innerHTML = '<span class="file-name">' + _esc(name) + '</span><span class="file-size">' + size + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (base64 || '') + '\',\'' + _esc(name) + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deletePartAttachment(this,\'' + prefix + '\')">删除</button>';
    });
  },

  // 零件：刷新指定字段的附件预览（删除后恢复显示用）
  _refreshPartAttachmentPreview: function(part, field) {
    var prefixMap = { sourceFile: 'fp-source', drawing: 'fp-drawing', stp: 'fp-stp', pdf: 'fp-pdf' };
    var prefix = prefixMap[field];
    if (!prefix) return;
    var input = document.getElementById(prefix);
    if (!input) return;
    var preview = input.parentElement.querySelector('.file-preview');
    if (!preview) return;
    var hasData = part[field + '_data'];
    if (hasData) {
      preview.innerHTML = '<span class="file-name">' + _esc(part[field] || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part[field + '_data'] || '') + '\',\'' + _esc(part[field] || '附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deletePartAttachment(this,\'' + field + '\')">删除</button>';
    } else {
      preview.innerHTML = '<span class="file-name empty">未上传</span>';
    }
  },

  // 部件编辑：文件选择后更新预览区（共用函数）
  _onCompFileChange: function(el, prefix) {
    var file = el.files[0];
    if (!file) return;
    var preview = el.parentElement.querySelector('.file-preview');
    if (!preview) return;
    var size = UI._formatFileSize(file.size);
    var name = file.name;
    UI._fileToBase64(file, function(base64) {
      preview.innerHTML = '<span class="file-name">' + _esc(name) + '</span><span class="file-size">' + size + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (base64 || '') + '\',\'' + _esc(name) + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deleteCompAttachment(this,\'' + prefix + '\')">删除</button>';
    });
  },

  // 删除零件附件
  _deletePartAttachment: function(btn, field) {
    var partId = window._editPartId;
    var part = Store.getById('parts', partId);
    if (!part) return;

    var doDelete = function() {
      API.deleteAttachment('part', part.id, field).then(function() {
        var fresh = Store.getById('parts', partId);
        if (fresh) {
          fresh[field] = '';
          fresh[field + '_data'] = '';
          Store.update('parts', partId, fresh);
        }
        Parts._editPart(partId);
      }).catch(function(err) {
        console.error('服务器附件删除失败', err);
        UI.toast('服务器附件删除失败，仍已清除本地记录', 'warning');
        var fresh = Store.getById('parts', partId);
        if (fresh) {
          fresh[field] = '';
          fresh[field + '_data'] = '';
          Store.update('parts', partId, fresh);
        }
        Parts._editPart(partId);
      });
    };

    UI.confirm('确定要删除此附件吗？此操作不可恢复。', doDelete, { noRestore: true, closeOnConfirm: false });
  },

  // 删除部件附件（共用函数）
  _deleteCompAttachment: function(btn, field) {
    var compId = window._editCompId;
    var comp = Store.getById('components', compId);
    if (!comp) return;

    var doDelete = function() {
      API.deleteAttachment('component', comp.id, field).then(function() {
        var fresh = Store.getById('components', compId);
        if (fresh) {
          fresh[field] = '';
          fresh[field + '_data'] = '';
          Store.update('components', compId, fresh);
        }
        Components._editComp(compId);
      }).catch(function(err) {
        console.error('服务器附件删除失败', err);
        UI.toast('服务器附件删除失败，仍已清除本地记录', 'warning');
        var fresh = Store.getById('components', compId);
        if (fresh) {
          fresh[field] = '';
          fresh[field + '_data'] = '';
          Store.update('components', compId, fresh);
        }
        Components._editComp(compId);
      });
    };

    UI.confirm('确定要删除此附件吗？此操作不可恢复。', doDelete, { noRestore: true, closeOnConfirm: false });
  },

  // 删除零件
  _deletePart: function(id) {
    var part = Store.getById('parts', id);
    if (!part) return;
    var isAdmin = Auth.getUser() && Auth.getUser().role === 'admin';
    if ((part.status === 'released' || part.status === 'obsolete') && !isAdmin) { UI.alert('"发布"和"作废"状态的零件仅管理员可删除'); return; }
    var used = Store.getAll('components').some(function(c) { return c.parts && c.parts.some(function(p) { return p.partId === id; }); });
    if (used) { UI.alert('该零件被引用，不能被删除'); return; }
    // 检查 BOM 引用
    var allBoms = Store.getAll('boms') || [];
    var parentBoms = [];
    var findParents = function(nodes) {
      if (!nodes || !Array.isArray(nodes)) return;
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node.partId === id) { parentBoms.push({ code: node.code || node.name || 'BOM节点', name: node.name || '' }); }
        if (node.children) findParents(node.children);
      }
    };
    for (var bi = 0; bi < allBoms.length; bi++) { findParents(allBoms[bi].tree); }
    if (parentBoms.length > 0) {
      UI.alert('该零件被引用，不能被删除');
      return;
    }
    // 检查是否存在更新版本
    var allParts = Store.getAll('parts');
    var newerVersions = allParts.filter(function(p) {
        return p.code === part.code && p.id !== id && (p.version || 'A').charCodeAt(0) > (part.version || 'A').charCodeAt(0);
    });
    if (newerVersions.length > 0) {
        UI.alert('该零件不是最新版本，不能被删除');
        return;
    }
    UI.confirm('确定要删除零件 <strong>' + part.code + ' - ' + part.name + '</strong> 吗？', function() {
      // 直接从本地删除并入队（skipSync=false），联网后后台队列自动同步到服务器
      Store.remove('parts', id);
      Store.addLog('删除零件', '删除零件 ' + part.code);
      UI.toast('删除成功（待同步）', 'success');
      Router.render();
    });
  },

  // 零件升版
  _upgradePart: function(id) {
    try {
    var oldPart = Store.getById('parts', id);
    if (!oldPart) { console.error('零件不存在:', id); UI.toast('零件不存在', 'error'); return; }
    // 只能对 released 或 obsolete 状态的零件进行升版
    if (oldPart.status !== 'released' && oldPart.status !== 'obsolete') { UI.alert('只有"发布"或"作废"状态的零件可以升版'); return; }
    // 检查是否是最新版本：查找同编码的其他零件
    var allParts = Store.getAll('parts').filter(function(p) { return p.code === oldPart.code; });
    var maxV = allParts.reduce(function(max, p) { var v = p.version || 'A'; var cv = v.charCodeAt(0); return cv > max ? cv : max; }, 0);
    if ((oldPart.version || 'A').charCodeAt(0) < maxV) { UI.alert('该零件存在更新版本，不能重复升版'); return; }
    // 计算新版本号：A->B->C->D...
    var v = oldPart.version || 'A';
    var newV = String.fromCharCode(v.charCodeAt(0) + 1);
    if (newV > 'Z') { UI.toast('版本号已超过Z，不再支持升版', 'error'); return; }
    // 生成新零件，编码相同（通过版本号区分）
    var newPart = JSON.parse(JSON.stringify(oldPart));
    newPart.id = _uuid();
    newPart.version = newV;
    newPart.status = 'draft'; // 新版本默认为草稿
    newPart.createdAt = Date.now();
    newPart.updatedAt = Date.now();
    // 构建修订记录：记录升版操作
    var revisions = oldPart.revisions || [];
    revisions.push({ date: Date.now(), author: (Auth.getUser() ? Auth.getUser().realName : '未知'), changes: [{ field: '版本', oldVal: oldPart.version, newVal: newV }] });
    oldPart.revisions = revisions;
    newPart.revisions = []; // 新版本从空白修订记录开始
    // 保存
    Store.update('parts', id, oldPart); // 更新原零件的历史
    Store.add('parts', newPart); // 添加新版本零件
    Store.addLog('零件升版', '零件 ' + oldPart.code + ' 从版本' + oldPart.version + ' 升版至 ' + newV);
    UI.toast('升版成功，新版本: ' + newV, 'success');
    UI.closeModal();
    Router.render();
    } catch(e) { console.error('升版错误:', e); UI.toast('升版失败: ' + e.message, 'error'); }
  },

  // 查看零件详情
  _viewPart: function(id) {
    var part = Store.getById('parts', id);
    if (!part) return;
    var ro = ' readonly';
    var revs = (part.revisions || []).slice().reverse();
    UI.modal('零件详情',
      '<div class="form-row"><div class="form-group"><label>件号</label><input type="text" value="' + _esc(part.code) + '"' + ro + '></div><div class="form-group"><label>名称</label><input type="text" value="' + _esc(part.name) + '"' + ro + '></div></div>' +
      '<div class="form-row"><div class="form-group"><label>规格型号</label><input type="text" value="' + _esc(part.spec||'') + '"' + ro + '></div><div class="form-group"><label>材料</label><input type="text" value="' + _esc(part.material||'') + '"' + ro + '></div></div>' +
      '<div class="form-row"><div class="form-group"><label>版本</label><input type="text" value="' + (part.version||'A') + '"' + ro + '></div><div class="form-group"><label>状态</label>' + UI.statusTag(part.status) + '</div></div>' +
      '<div class="form-row"><div class="form-group"><label>源文件</label><input type="text" value="' + _esc(part.sourceFile||'') + '"' + ro + '>' + (part.sourceFile_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.sourceFile_data||'') + '\',\'' + _esc(part.sourceFile||'附件') + '\')">⬇ 下载</button>' : '') + '</div><div class="form-group"><label>图纸</label><input type="text" value="' + _esc(part.drawing||'') + '"' + ro + '>' + (part.drawing_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.drawing_data||'') + '\',\'' + _esc(part.drawing||'附件') + '\')">⬇ 下载</button>' : '') + '</div></div>' +
      '<div class="form-row"><div class="form-group"><label>STP</label><input type="text" value="' + _esc(part.stp||'') + '"' + ro + '>' + (part.stp_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.stp_data||'') + '\',\'' + _esc(part.stp||'附件') + '\')">⬇ 下载</button>' : '') + '</div><div class="form-group"><label>PDF</label><input type="text" value="' + _esc(part.pdf||'') + '"' + ro + '>' + (part.pdf_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.pdf_data||'') + '\',\'' + _esc(part.pdf||'附件') + '\')">⬇ 下载</button>' : '') + '</div></div>' +
      (part.remark ? '<div class="form-group"><label>备注</label><textarea' + ro + ' style="width:100%;min-height:60px;resize:vertical;padding:8px;border:1px solid #ddd;border-radius:4px;background:#f9f9f9">' + _esc(part.remark) + '</textarea></div>' : '') +
      '<h4 style="margin:20px 0 12px">📝 修订记录 (' + revs.length + ')</h4>' +
      (revs.length > 0 ? '<div class="log-list">' + revs.map(function(rev) {
        var changesHtml = rev.changes.map(function(c) {
          return '<span class="rev-change"><strong>' + _esc(c.field) + '</strong>：' +
            '<span style="color:#ff4d4f;text-decoration:line-through">' + _esc(c.oldVal || '(空)') + '</span> → ' +
            '<span style="color:#52c41a">' + _esc(c.newVal || '(空)') + '</span></span>';
        }).join('&nbsp;&nbsp;');
        return '<div class="log-item" style="flex-direction:column;align-items:flex-start;gap:4px">' +
          '<div><span class="log-time">' + UI.formatDate(rev.date) + '</span><span class="log-user">' + _esc(rev.author) + '</span></div>' +
          '<div style="font-size:13px;line-height:1.6">' + changesHtml + '</div></div>';
      }).join('') + '</div>' : '<div style="padding:16px;text-align:center;color:var(--text-light);background:#fafafa;border-radius:4px">暂无修订记录</div>'),
      { footer: '<button class="btn-primary" onclick="UI.closeModal()">关闭</button>' });
  }
};