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
        '</div><div class="table-wrapper"><table id="parts-table"><thead><tr><th data-sort="code" class="th-sortable">件号<span class="th-sort-icon"></span></th><th data-sort="name" class="th-sortable">名称<span class="th-sort-icon"></span></th><th data-sort="spec" class="th-sortable">规格型号<span class="th-sort-icon"></span></th><th data-sort="version" class="th-sortable">版本<span class="th-sort-icon"></span></th><th data-sort="status" class="th-sortable">状态<span class="th-sort-icon"></span></th><th>操作</th></tr></thead><tbody>' +
        (pd.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:40px)">暂无数据</td></tr>' :
          pd.map(function(p) {
            return '<tr onclick="Parts._viewPart(\'' + p.id + '\');" style="cursor:pointer"><td>' + p.code + '</td><td>' + p.name + '</td><td>' + _esc(p.spec||'') + '</td><td><span class="tag" style="background:#e6f7ff;color:#1890ff;font-weight:600">' + (p.version||'A') + '</span></td><td>' + UI.statusTag(p.status) + '</td><td>' + (canE ? '<button class="btn-text" onclick="event.stopPropagation();Parts._editPart(\'' + p.id + '\')">编辑</button><button class="btn-text danger" onclick="event.stopPropagation();Parts._deletePart(\'' + p.id + '\')">删除</button>' : '<span style="color:var(--text-light);font-size:12px">只读</span>') + '</td></tr>';
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
      '<div class="form-row"><div class="form-group"><label>规格型号</label><input type="text" id="fp-spec" value="' + _esc(part ? part.spec : '') + '"' + ro + '></div><div class="form-group"><label>版本</label><input type="text" id="fp-version" value="' + (part ? part.version || 'A' : 'A') + '" readonly></div></div>' +
      '<div class="form-row"><div class="form-group"><label>状态</label><select id="fp-st"' + roExceptStatus + '><option value="draft"' + (!part || part.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="frozen"' + (part && part.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (part && part.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (part && part.status === 'obsolete' ? ' selected' : '') + '>作废</option></select></div></div>' +
      '<div id="cf-part-edit-area"></div>' +  // 自定义字段占位
      '<div id="part-attachments-area"></div>' +  // 附件占位
      (isNotDraft ? '<div style="margin-top:10px;color:#faad14;font-size:12px">⚠️ 当前状态为"' + (part.status === 'frozen' ? '冻结' : part.status === 'released' ? '发布' : '作废') + '"，字段已锁定。' + (isFrozen ? '管理员和工程师可修改状态。' : '仅管理员可修改状态。') + '</div>' : ''),
      { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button>' + (part && (part.status === 'released' || part.status === 'obsolete') ? '<button class="btn-primary" onclick="Parts._upgradePart(\'' + part.id + '\')">升版</button>' : '') + '<button class="btn-primary" id="btn-sp">保存</button>', large: true,
        afterRender: function() {
          // 加载自定义字段编辑区
          _loadCFDefs().then(function(cfDefs) {
            var cfArea = document.getElementById('cf-part-edit-area');
            if (!cfArea) return;
            var cfValues = part ? (part.customFields || {}) : {};
            cfArea.innerHTML = _renderCFEditHtml(cfValues, cfDefs, 'part', ro);
          });
          // 加载附件列表（编辑时）
          if (part && part.id) {
            Parts._loadAttachmentsForEdit('part', part.id, 'part-attachments-area');
          }
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
      var data = {
        code:code, name:name,
        spec:document.getElementById('fp-spec').value.trim(),
        version:newV,
        status:document.getElementById('fp-st').value,
      };
      if (part) {
        Store.update('parts', id, data);
        Store.addLog('编辑零件', '修改零件 ' + code);
        var cfDefsForSave = Store.getAll('custom_field_defs');
        var cfVals = _collectCFValues(cfDefsForSave, 'part');
        Store.update('parts', id, { customFields: cfVals }, { skipSync: true });
        _saveCFValues('part', id, cfVals, cfDefsForSave);
        UI.toast('零件更新成功', 'success');
    } else {
        Store.add('parts', data);
        Store.addLog('新增零件', '新增零件 ' + code + ' - ' + name);
        var cfDefsForSave2 = Store.getAll('custom_field_defs');
        var cfVals2 = _collectCFValues(cfDefsForSave2, 'part');
        if (Object.keys(cfVals2).length > 0) {
          data.customFields = cfVals2;
          Store.update('parts', data.id, { customFields: cfVals2 }, { skipSync: true });
          _saveCFValues('part', data.id, cfVals2, cfDefsForSave2);
        }
        UI.toast('零件新增成功', 'success');
      }
      UI.closeModal(); Router.render();
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
    // Deleted: no longer tracking revisions
    // Save
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

    // 加载自定义字段
    _loadCFDefs().then(function(cfDefs) {
      var cfValues = part.customFields || {};
      var cfHtml = _renderCFViewHtml(cfValues, cfDefs, 'part');

      // 修订记录HTML
      var revHtml = '<h4 style="margin:20px 0 12px">📝 修订记录 (' + revs.length + ')</h4>';
      revHtml += revs.length > 0 ? '<div class="log-list">' + revs.map(function(rev) {
        var changesHtml = rev.changes.map(function(c) {
          return '<span class="rev-change"><strong>' + _esc(c.field) + '</strong>：' +
            '<span style="color:#ff4d4f;text-decoration:line-through">' + _esc(c.oldVal || '(空)') + '</span> → ' +
            '<span style="color:#52c41a">' + _esc(c.newVal || '(空)') + '</span></span>';
        }).join('&nbsp;&nbsp;');
        return '<div class="log-item" style="flex-direction:column;align-items:flex-start;gap:4px">' +
          '<div><span class="log-time">' + UI.formatDate(rev.date) + '</span><span class="log-user">' + _esc(rev.author) + '</span></div>' +
          '<div style="font-size:13px;line-height:1.6">' + changesHtml + '</div></div>';
      }).join('') + '</div>' : '<div style="padding:16px;text-align:center;color:var(--text-light);background:#fafafa;border-radius:4px">暂无修订记录</div>';

      UI.modal('零件详情',
        '<div class="form-row"><div class="form-group"><label>件号</label><input type="text" value="' + _esc(part.code) + '"' + ro + '></div><div class="form-group"><label>名称</label><input type="text" value="' + _esc(part.name) + '"' + ro + '></div></div>' +
        '<div class="form-row"><div class="form-group"><label>规格型号</label><input type="text" value="' + _esc(part.spec||'') + '"' + ro + '></div><div class="form-group"><label>版本</label><input type="text" value="' + (part.version||'A') + '"' + ro + '></div></div>' +
        '<div class="form-row"><div class="form-group"><label>状态</label>' + UI.statusTag(part.status) + '</div></div>' +
        cfHtml +
        '<div id="part-attachments-view"></div>',
        { footer: '<button class="btn-primary" onclick="UI.closeModal()">关闭</button>',
          afterRender: function() {
            var attView = document.getElementById('part-attachments-view');
            if (attView && part.id) {
              API.listAttachments('part', part.id).then(function(attachments) {
                attachments = attachments || [];
                var html = '<h4 style="margin:20px 0 12px">📎 附件</h4>';
                var fileTypes = ['source_file', 'drawing', 'stp', 'pdf'];
                var fileLabels = { source_file: '源文件', drawing: '图纸', stp: 'STP', pdf: 'PDF' };
                fileTypes.forEach(function(ft) {
                  var att = attachments.find(function(a) { return a.file_type === ft; });
                  html += '<div style="display:flex;align-items:center;margin-bottom:8px;font-size:13px">';
                  html += '<span style="width:60px;flex-shrink:0">' + fileLabels[ft] + '</span>';
                  if (att) {
                    html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(att.file_name || '') + '">' + _esc(att.file_name || '(无名称)') + '</span>';
                    html += '<button type="button" class="btn-link" onclick="Parts._downloadAttachment(\'' + att.id + '\')">下载</button>';
                  } else {
                    html += '<span style="flex:1;color:#999">未上传</span>';
                  }
                  html += '</div>';
                });
                attView.innerHTML = html;
              }).catch(function(err) {
                console.error('加载附件失败', err);
              });
            }
          }
        });
    });
  },

  // 加载附件列表并渲染
  _loadAttachmentsForEdit: function(entityType, entityId, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    API.listAttachments(entityType, entityId).then(function(attachments) {
      var html = '<h4 style="margin:16px 0 12px;border-top:1px solid #f0f0f0;padding-top:16px">📎 附件</h4>';
      var fileTypes = ['source_file', 'drawing', 'stp', 'pdf'];
      var fileLabels = { source_file: '源文件', drawing: '图纸', stp: 'STP', pdf: 'PDF' };
      fileTypes.forEach(function(ft) {
        var att = attachments.find(function(a) { return a.file_type === ft; });
        html += '<div style="display:flex;align-items:center;margin-bottom:8px;font-size:13px">';
        html += '<span style="width:60px;flex-shrink:0">' + fileLabels[ft] + '</span>';
        if (att) {
          html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:50px" title="' + _esc(att.file_name || '') + '">' + _esc(att.file_name || '(无名称)') + '</span>';
          html += '<button type="button" class="btn-link" onclick="Parts._downloadAttachment(\'' + att.id + '\')">下载</button>';
          html += '<button type="button" class="btn-link" style="color:#ff4d4f" onclick="Parts._deleteAttachment(\'' + att.id + '\',\'' + entityType + '\',\'' + entityId + '\',\'' + ft + '\')">删除</button>';
        } else {
          html += '<span style="flex:1;color:#999">未上传</span>';
          html += '<input type="file" id="att-' + ft + '" style="display:none" onchange="Parts._onAttachmentChange(\'' + entityType + '\',\'' + entityId + '\',\'' + ft + '\',this)">';
          html += '<button type="button" class="btn-link" onclick="document.getElementById(\'att-' + ft + '\').click()">上传</button>';
        }
        html += '</div>';
      });
      container.innerHTML = html;
    }).catch(function(err) {
      console.error('加载附件失败', err);
    });
  },

  // 附件上传（异步，不阻塞UI）
  _onAttachmentChange: function(entityType, entityId, fileType, input) {
    var file = input.files[0];
    if (!file) return;
    UI._fileToBase64(file, function(base64) {
      // 不关闭modal，用户可继续操作或保存
      Store._uploadProgress = { percent: 0, fileName: file.name };
      Store._currentTask = { entity: 'attachment', op: 'upload', record: { code: file.name } };
      SyncPanel.updatePanel();
      API.uploadAttachment(entityType, entityId, fileType, file.name, base64, function(percent) {
        Store._uploadProgress = { percent: percent, fileName: file.name };
        SyncPanel.updatePanel();
      }).then(function() {
        Store._uploadProgress = null;
        Store._currentTask = null;
        UI.toast('附件上传成功', 'success');
        Parts._loadAttachmentsForEdit(entityType, entityId, 'part-attachments-area');
        SyncPanel.updatePanel();
      }).catch(function(err) {
        Store._uploadProgress = null;
        Store._currentTask = null;
        console.error('附件上传失败', err);
        UI.toast('附件上传失败: ' + (err.message || err), 'error');
        SyncPanel.updatePanel();
      });
    });
  },

  // 下载附件
  _downloadAttachment: function(attachmentId) {
    API.getAttachment(attachmentId).then(function(att) {
      if (att && att.file_data) {
        UI._downloadBase64(att.file_data, att.file_name || '附件');
      } else {
        UI.toast('附件数据为空', 'warning');
      }
    }).catch(function(err) {
      UI.toast('下载失败: ' + (err.message || err), 'error');
    });
  },

  // 删除附件
  _deleteAttachment: function(attachmentId, entityType, entityId, fileType) {
    var partId = window._editPartId;
    UI.confirm('确定要删除此附件吗？', function() {
      API.deleteAttachment(entityType, entityId, fileType).then(function() {
        UI.toast('附件已删除', 'success');
        Parts._editPart(partId);
      }).catch(function(err) {
        UI.toast('删除失败: ' + (err.message || err), 'error');
      });
    }, { noRestore: true });
  }
};