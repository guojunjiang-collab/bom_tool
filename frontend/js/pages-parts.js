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
        '</div><div class="table-wrapper"><table id="parts-table"><thead><tr><th data-sort="code" class="th-sortable">件号<span class="th-sort-icon"></span></th><th data-sort="name" class="th-sortable">中文名称<span class="th-sort-icon"></span></th><th data-sort="spec" class="th-sortable">规格型号<span class="th-sort-icon"></span></th><th data-sort="version" class="th-sortable">版本<span class="th-sort-icon"></span></th><th data-sort="status" class="th-sortable">状态<span class="th-sort-icon"></span></th><th>操作</th></tr></thead><tbody>' +
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
    var statusLabel = function(v) { return {draft:'草稿',frozen:'冻结',released:'发布',obsolete:'作废'}[v] || v; };
    var columns = [
      {key:'code',label:'件号'},{key:'name',label:'中文名称'},{key:'spec',label:'规格'},
      {key:'version',label:'版本'},
      {key:'status',label:'状态',render:function(r){return statusLabel(r.status);}},
    ];
    // 动态追加自定义字段
    var cfDefs = Store.getAll('custom_field_defs');
    cfDefs.forEach(function(d) {
      if (d.applies_to === 'part' || d.applies_to === 'both') {
        columns.push({key:'customFields',label:d.name,render:function(r){
          return (r.customFields && r.customFields[d.field_key]) ? r.customFields[d.field_key] : '';
        }});
      }
    });
    UI.exportCSV(Store.getAll('parts'), '零件清单.csv', columns);
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
      '<div class="form-row"><div class="form-group"><label>零件件号 <span class="required">*</span></label><input type="text" id="fp-code" value="' + (part ? part.code : '') + '" placeholder="如 PT-021"' + ro + '></div><div class="form-group"><label>零件中文名称 <span class="required">*</span></label><input type="text" id="fp-name" value="' + (part ? part.name : '') + '" placeholder="如 M12螺栓"' + ro + '></div></div>' +
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
            if (part && part.id) {
              API.getCustomFieldValues('part', part.id).then(function(list) {
                var cfMap = {};
                (list || []).forEach(function(v) { if (v.field_key) cfMap[v.field_key] = v.value; });
                part.customFields = cfMap;
                cfArea.innerHTML = _renderCFEditHtml(cfMap, cfDefs, 'part', ro);
              }).catch(function() {
                var cfValues = part ? (part.customFields || {}) : {};
                cfArea.innerHTML = _renderCFEditHtml(cfValues, cfDefs, 'part', ro);
              });
            } else {
              var cfValuesLocal = part ? (part.customFields || {}) : {};
              cfArea.innerHTML = _renderCFEditHtml(cfValuesLocal, cfDefs, 'part', ro);
            }
          });
          // 加载附件列表（编辑时）
          if (part && part.id) {
            Parts._loadAttachmentsForEdit(part);
          }
          // 保存按钮事件
            document.getElementById('btn-sp').onclick = function() {
            console.log('[DEBUG] btn-sp clicked, part=', part ? part.id : 'new');
            var code = document.getElementById('fp-code').value.trim();
            var name = document.getElementById('fp-name').value.trim();
            if (!code || !name) { UI.toast('件号和中文名称为必填项', 'warning'); return; }
            var existingParts = Store.getAll('parts');
            var dup = existingParts.find(function(p) { return p.code === code && p.version === (part ? part.version : 'A') && (!part || p.id !== part.id); });
            if (dup) { UI.toast('该件号+版本组合已存在', 'error'); return; }
            var user = Auth.getUser();
            var isAdmin = user && user.role === 'admin';
            var isDraft = !part || part.status === 'draft';
            if (!isDraft && !isAdmin) {
              if (!isFrozen || userRole !== 'engineer') {
                UI.alert('只有"草稿"状态的零件可编辑'); return;
              }
            }
            var newV = part ? part.version : 'A';
            var data = {
              code:code, name:name,
              spec:document.getElementById('fp-spec').value.trim(),
              version:newV,
              status:document.getElementById('fp-st').value,
            };
            console.log('[DEBUG] saving data:', data);
              if (part) {
              Store.update('parts', part.id, data);
              Store.addLog('编辑零件', '修改零件 ' + code);
              var cfDefsForSave = Store.getAll('custom_field_defs');
              var cfVals = _collectCFValues(cfDefsForSave, 'part');
              Store.update('parts', part.id, { customFields: cfVals }, { skipSync: true });
              _saveCFValues('part', part.id, cfVals, cfDefsForSave);
              UI.toast('零件更新成功', 'success');
            } else {
              Store.add('parts', data);
              Store.addLog('新增零件', '新增零件 ' + code + ' - ' + name);
              var cfDefsForSave2 = cfDefs;
              var cfVals2 = _collectCFValues(cfDefsForSave2, 'part');
              if (cfVals2 && Object.keys(cfVals2).length > 0) {
                if (part) {
                  Store.update('parts', part.id, { customFields: cfVals2 }, { skipSync: true });
                  _saveCFValues('part', part.id, cfVals2, cfDefsForSave2);
                }
              }
              UI.toast('零件新增成功', 'success');
            }
            UI.closeModal(); Router.render();
          };
        }
      });
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
      // 1) 尝试使用服务端的自定义字段值来渲染，避免本地旧数据覆盖
      var renderCfArea = function(cfMap) {
        var cfHtml = _renderCFViewHtml(cfMap || {}, cfDefs, 'part');
        // 放入一个占位容器以便后续替换
        var cfContainer = document.getElementById('part-cf-view-area');
        if (cfContainer) cfContainer.innerHTML = cfHtml;
      };
      if (part && part.id) {
        try {
          API.getCustomFieldValues('part', part.id).then(function(list) {
            var map = {};
            (list || []).forEach(function(v) { if (v.field_key) map[v.field_key] = v.value; });
            part.customFields = map;
            renderCfArea(map);
          }).catch(function() {
            renderCfArea(cfValues);
          });
        } catch (e) {
          renderCfArea(cfValues);
        }
      } else {
        renderCfArea(cfValues);
      }

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
        '<div class="form-row"><div class="form-group"><label>件号</label><input type="text" value="' + _esc(part.code) + '"' + ro + '></div><div class="form-group"><label>中文名称</label><input type="text" value="' + _esc(part.name) + '"' + ro + '></div></div>' +
        '<div class="form-row"><div class="form-group"><label>规格型号</label><input type="text" value="' + _esc(part.spec||'') + '"' + ro + '></div><div class="form-group"><label>版本</label><input type="text" value="' + (part.version||'A') + '"' + ro + '></div></div>' +
        '<div class="form-row"><div class="form-group"><label>状态</label>' + UI.statusTag(part.status) + '</div></div>' +
          '<div id="part-cf-view-area"></div>' +
        '<div id="view-part-edocs-area">' + Parts._renderAttachmentsView(part) + '</div>',
        { footer: '<button class="btn-primary" onclick="UI.closeModal()">关闭</button>',
      afterRender: function() {
        if (part && part.id) {
          API._fetch('GET', '/parts/' + part.id + '/documents').then(function(list) {
            part._entityDocs = list;
            var area = document.getElementById('view-part-edocs-area');
            if (area) area.innerHTML = Parts._renderAttachmentsView(part);
            // 同时刷新 CF 展示区，确保显示服务器端的自定义字段
            _refreshPartCFView(part);
          });
        }
      }
        });
    });
  },

  _renderAttachmentsView: function(part) {
    var edocList = (part._entityDocs || []);
    var html = '<h4 style="margin:20px 0 12px">📎 关联图文档</h4>';
    if (edocList.length === 0) {
      html += '<div style="padding:12px;text-align:center;color:#999;font-size:13px">暂无关联图文档</div>';
      return html;
    }
    html += '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#fafafa"><th style="padding:6px 10px;text-align:left;font-size:12px;color:#888">图文档编号</th><th style="padding:6px 10px;text-align:left;font-size:12px;color:#888">图文档名称</th><th style="padding:6px 10px;text-align:left;font-size:12px;color:#888">版本</th><th style="padding:6px 10px;text-align:center;font-size:12px;color:#888">状态</th><th style="padding:6px 10px;text-align:left;font-size:12px;color:#888">主附件</th></tr></thead><tbody>';
    edocList.forEach(function(ed) {
      var d = ed.document || {};
      html += '<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px 10px;font-weight:500">' + _esc(d.code || '') + '</td><td style="padding:6px 10px">' + _esc(d.name || '') + '</td><td style="padding:6px 10px">' + _esc(d.version || '') + '</td><td style="padding:6px 10px;text-align:center">' + UI.statusTag(d.status || 'draft') + '</td><td style="padding:6px 10px">' + (d.file_name ? _esc(d.file_name) : '<span style="color:#ccc">—</span>') + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  },

  _loadAttachmentsForEdit: function(part) {
    var container = document.getElementById('part-attachments-area');
    if (!container) return;

    function render(edocs) {
      var html = '<div id="edoc-list-area"></div>' +
        '<button class="btn-outline btn-sm" id="btn-add-edoc" style="margin-top:8px">+ 关联图文档</button>';
      container.innerHTML = html;

      var listArea = document.getElementById('edoc-list-area');
      if (!edocs || edocs.length === 0) {
        listArea.innerHTML = '<div style="padding:12px;text-align:center;color:#999;font-size:13px">暂无关联，点击下方"关联文本档"添加</div>';
      } else {
          edocs.forEach(function(ed) {
            var d = ed.document || {};
          var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;margin-bottom:6px;font-size:13px;gap:8px';
          row.innerHTML =
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500" title="' + _esc(d.code || '') + '">' + _esc(d.code || '') + ' · ' + _esc(d.name || '') + '</span>' +
            '<span style="color:#999;font-size:12px">' + _esc(d.version || '') + '</span>' +
            '<button class="btn-link edoc-remove-btn" data-id="' + ed.id + '" style="color:#ff4d4f">移除</button>';
          listArea.appendChild(row);
          });
        listArea.querySelectorAll('.edoc-remove-btn').forEach(function(btn) {
          btn.onclick = function() {
            var eid = btn.dataset.id;
            API._fetch('DELETE', '/parts/' + part.id + '/documents/' + eid).then(function() {
              UI.toast('关联已移除', 'success');
              API._fetch('GET', '/parts/' + part.id + '/documents').then(function(list) {
                render(list);
                var allParts = Store.getAll('parts');
                var pIdx = allParts.findIndex(function(p) { return p.id === part.id; });
                if (pIdx >= 0) allParts[pIdx]._entityDocs = list;
              });
            }).catch(function(e) { UI.toast('移除失败: ' + e.message, 'error'); });
          };
        });
        // 已移除类别字段的编辑能力，不再监听类别输入
      }

      document.getElementById('btn-add-edoc').onclick = function() { Parts._showDocSelector(part.id); };
    }

    API._fetch('GET', '/parts/' + part.id + '/documents').then(function(list) {
      var allParts = Store.getAll('parts');
      var pIdx = allParts.findIndex(function(p) { return p.id === part.id; });
      if (pIdx >= 0) allParts[pIdx]._entityDocs = list;
      Store.saveAll('parts', allParts);
      render(list);
    }).catch(function() { render([]); });
  },

  _showDocSelector: function(partId) {
    var selectedDocs = [];
    var docs = [];
    API._fetch('GET', '/documents/').then(function(allDocs) {
      docs = allDocs || [];
      var html = '<input type="text" id="doc-sel-search" class="form-input" placeholder="搜索编号或名称..." style="margin-bottom:8px">' +
        '<div id="doc-sel-list" style="max-height:300px;overflow-y:auto"></div>';
      UI.modal('选择图文档', html, {
        footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-confirm-edoc">确认关联</button>',
        afterRender: function() {
          function renderList(kw) {
            var list = docs.filter(function(d) {
              if (!kw) return true;
              return (d.code && d.code.toLowerCase().indexOf(kw) !== -1) || (d.name && d.name.toLowerCase().indexOf(kw) !== -1);
            });
            var el = document.getElementById('doc-sel-list');
            if (list.length === 0) { el.innerHTML = '<div style="padding:20px;text-align:center;color:#999">无匹配结果</div>'; return; }
            el.innerHTML = list.map(function(d) {
              var checked = selectedDocs.indexOf(d.id) >= 0 ? ' checked' : '';
              return '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #f0f0f0;cursor:pointer"><input type="checkbox" value="' + d.id + '"' + checked + '><span style="flex:1"><strong>' + _esc(d.code) + '</strong> · ' + _esc(d.name) + '</span><span style="color:#999;font-size:12px">' + _esc(d.version) + '</span></label>';
            }).join('');
          }
          renderList();
          document.getElementById('doc-sel-search').oninput = function() { renderList(this.value.trim().toLowerCase()); };
          document.getElementById('btn-confirm-edoc').onclick = function() {
            var checks = document.querySelectorAll('#doc-sel-list input[type=checkbox]:checked');
            var ids = Array.from(checks).map(function(c) { return c.value; }).filter(function(id) { return id; });
            if (ids.length === 0) { UI.toast('至少选择一个图文档', 'warning'); return; }
            // 过滤掉已关联的图文档，避免重复关联
            var existingPart = (Store.getAll('parts') || []).find(function(p) { return p.id === partId; });
            var existingDocIds = [];
            if (existingPart && existingPart._entityDocs) {
              existingDocIds = existingPart._entityDocs.map(function(ed) {
                var d = ed.document || {};
                return d.id || ed.document_id || null;
              }).filter(function(x) { return !!x; });
            }
            var toAdd = ids.filter(function(id) { return existingDocIds.indexOf(id) < 0; });
            if (toAdd.length === 0) {
              UI.toast('所选图文档已关联，请勿重复关联', 'info');
              return;
            }
            var promises = toAdd.map(function(docId) {
              return API._fetch('POST', '/parts/' + partId + '/documents', { id: _uuid(), document_id: docId, sort_order: 0 });
            });
            Promise.all(promises).then(function() {
              UI.toast('关联成功', 'success');
              if (typeof Parts._loadAttachmentsForEdit === 'function') {
                var p = Store.getById('parts', partId);
                if (p) Parts._loadAttachmentsForEdit(p);
              }
              UI.closeModal();
            }).catch(function(e) { UI.toast('关联失败: ' + e.message, 'error'); });
          };
        }
      });
    }).catch(function(e) { UI.toast('获取文本档列表失败: ' + e.message, 'error'); });
  }
};
