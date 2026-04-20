const Pages = {



  /* ===== Dashboard ===== */

  dashboard: function(c) {

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

  },



  /* ===== Parts ===== */

  parts: function(c) {

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

          '<button class="btn-outline" onclick="Pages._exportParts()">📥 导出Excel</button>' +

          (canE ? '<button class="btn-primary" id="btn-add-part">＋ 新增零件</button>' : '') +

        '</div></div>' +

        '<div class="card"><div class="toolbar">' +

          '<div class="search-box"><input type="text" id="ps" placeholder="搜索件号/名称/规格..." value="' + _esc(_f.keyword) + '"></div>' +

          '<select id="pst"><option value="">全部状态</option><option value="draft"' + (_f.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="frozen"' + (_f.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (_f.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (_f.status === 'obsolete' ? ' selected' : '') + '>作废</option></select>' +

          '<div class="spacer"></div><span style="font-size:13px;color:var(--text-secondary)">共 ' + total + ' 条</span>' +

        '</div><div class="table-wrapper"><table id="parts-table"><thead><tr><th data-sort="code" class="th-sortable">件号<span class="th-sort-icon"></span></th><th data-sort="name" class="th-sortable">名称<span class="th-sort-icon"></span></th><th data-sort="spec" class="th-sortable">规格型号<span class="th-sort-icon"></span></th><th data-sort="version" class="th-sortable">版本<span class="th-sort-icon"></span></th><th>材料</th><th data-sort="status" class="th-sortable">状态<span class="th-sort-icon"></span></th><th>操作</th></tr></thead><tbody>' +

        (pd.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:40px">暂无数据</td></tr>' :

          pd.map(function(p) {

            return '<tr onclick="Pages._viewPart(\'' + p.id + '\');" style="cursor:pointer"><td>' + p.code + '</td><td>' + p.name + '</td><td>' + _esc(p.spec||'') + '</td><td><span class="tag" style="background:#e6f7ff;color:#1890ff;font-weight:600">' + (p.version||'A') + '</span></td><td>' + _esc(p.material||'') + '</td><td>' + UI.statusTag(p.status) + '</td><td>' + (canE ? '<button class="btn-text" onclick="event.stopPropagation();Pages._editPart(\'' + p.id + '\')">编辑</button><button class="btn-text danger" onclick="event.stopPropagation();Pages._deletePart(\'' + p.id + '\')">删除</button>' : '<span style="color:var(--text-light);font-size:12px">只读</span>') + '</td></tr>';

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

      if (ab) ab.onclick = function() { Pages._editPart(null); };

    }

    render();

  },



  _exportParts: function() {

    UI.exportCSV(Store.getAll('parts'), '零件清单.csv', [

      {key:'code',label:'件号'},{key:'name',label:'名称'},{key:'spec',label:'规格'},

      {key:'version',label:'版本'},{key:'status',label:'状态'}

    ]);

  },



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

      '<div class="form-row"><div class="form-group"><label>源文件</label>' + (part && part.sourceFile_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.sourceFile || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.sourceFile_data||'') + '\',\'' + _esc(part.sourceFile||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deletePartAttachment(this,\'sourceFile\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-source" accept="*/*" onchange="Pages._onFileChange(this,\'fp-source\')"' + ro + '></div><div class="form-group"><label>图纸</label>' + (part && part.drawing_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.drawing || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.drawing_data||'') + '\',\'' + _esc(part.drawing||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deletePartAttachment(this,\'drawing\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-drawing" accept="*/*" onchange="Pages._onFileChange(this,\'fp-drawing\')"' + ro + '></div></div>' +

      '<div class="form-row"><div class="form-group"><label>STP</label>' + (part && part.stp_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.stp || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.stp_data||'') + '\',\'' + _esc(part.stp||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deletePartAttachment(this,\'stp\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-stp" accept="*/*" onchange="Pages._onFileChange(this,\'fp-stp\')"' + ro + '></div><div class="form-group"><label>PDF</label>' + (part && part.pdf_data ? '<div class="file-preview"><span class="file-name">' + _esc(part.pdf || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part.pdf_data||'') + '\',\'' + _esc(part.pdf||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deletePartAttachment(this,\'pdf\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fp-pdf" accept="*/*" onchange="Pages._onFileChange(this,\'fp-pdf\')"' + ro + '></div></div>' +

      '<div class="form-group full"><label>备注</label><textarea id="fp-rem"' + ro + '>' + (part ? _esc(part.remark||'') : '') + '</textarea></div>' +

      (isNotDraft ? '<div style="margin-top:10px;color:#faad14;font-size:12px">⚠️ 当前状态为"' + (part.status === 'frozen' ? '冻结' : part.status === 'released' ? '发布' : '作废') + '"，字段已锁定。' + (isFrozen ? '管理员和工程师可修改状态。' : '仅管理员可修改状态。') + '</div>' : ''),

      { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button>' + (part && (part.status === 'released' || part.status === 'obsolete') ? '<button class="btn-primary" onclick="Pages._upgradePart(\'' + part.id + '\')">升版</button>' : '') + '<button class="btn-primary" id="btn-sp">保存</button>', large: true,

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

      preview.innerHTML = '<span class="file-name">' + _esc(name) + '</span><span class="file-size">' + size + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (base64 || '') + '\',\'' + _esc(name) + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deletePartAttachment(this,\'' + prefix + '\')">删除</button>';

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

      preview.innerHTML = '<span class="file-name">' + _esc(part[field] || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (part[field + '_data'] || '') + '\',\'' + _esc(part[field] || '附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deletePartAttachment(this,\'' + field + '\')">删除</button>';

    } else {

      preview.innerHTML = '<span class="file-name empty">未上传</span>';

    }

  },



  // 部件编辑：文件选择后更新预览区

  _onCompFileChange: function(el, prefix) {

    var file = el.files[0];

    if (!file) return;

    var preview = el.parentElement.querySelector('.file-preview');

    if (!preview) return;

    var size = UI._formatFileSize(file.size);

    var name = file.name;

    UI._fileToBase64(file, function(base64) {

      preview.innerHTML = '<span class="file-name">' + _esc(name) + '</span><span class="file-size">' + size + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (base64 || '') + '\',\'' + _esc(name) + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deleteCompAttachment(this,\'' + prefix + '\')">删除</button>';

    });

  },



  // 删除零件附件

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

        Pages._editPart(partId);

      }).catch(function(err) {

        console.error('服务器附件删除失败', err);

        UI.toast('服务器附件删除失败，仍已清除本地记录', 'warning');

        var fresh = Store.getById('parts', partId);

        if (fresh) {

          fresh[field] = '';

          fresh[field + '_data'] = '';

          Store.update('parts', partId, fresh);

        }

        Pages._editPart(partId);

      });

    };



    UI.confirm('确定要删除此附件吗？此操作不可恢复。', doDelete, { noRestore: true, closeOnConfirm: false });

  },

  // 删除部件附仦

  // 删除部件附件

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

        Pages._editComp(compId);

      }).catch(function(err) {

        console.error('服务器附件删除失败', err);

        UI.toast('服务器附件删除失败，仍已清除本地记录', 'warning');

        var fresh = Store.getById('components', compId);

        if (fresh) {

          fresh[field] = '';

          fresh[field + '_data'] = '';

          Store.update('components', compId, fresh);

        }

        Pages._editComp(compId);

      });

    };



    UI.confirm('确定要删除此附件吗？此操作不可恢复。', doDelete, { noRestore: true, closeOnConfirm: false });

  },

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



  /* ===== Components ===== */

  components: function(c) {

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

        '<div class="table-wrapper"><table id="components-table"><thead><tr><th data-sort="code" class="th-sortable">件号<span class="th-sort-icon"></span></th><th data-sort="name" class="th-sortable">名称<span class="th-sort-icon"></span></th><th data-sort="spec" class="th-sortable">规格<span class="th-sort-icon"></span></th><th data-sort="version" class="th-sortable">版本<span class="th-sort-icon"></span></th><th data-sort="parts" class="th-sortable">零件数<span class="th-sort-icon"></span></th><th data-sort="status" class="th-sortable">状态<span class="th-sort-icon"></span></th><th data-sort="updatedAt" class="th-sortable">更新时间<span class="th-sort-icon"></span></th><th>操作</th></tr></thead><tbody>' +

        (data.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text-light);padding:40px">暂无数据</td></tr>' :

          data.map(function(c2) { return '<tr onclick="Pages._viewComp(\'' + c2.id + '\');" style="cursor:pointer"><td><strong>' + c2.code + '</strong></td><td>' + c2.name + '</td><td>' + (c2.spec||'-') + '</td><td><span class="tag" style="background:#e6f7ff;color:#1890ff;font-weight:600">' + c2.version + '</span></td><td>' + (c2.parts||[]).length + ' 种</td><td>' + UI.statusTag(c2.status) + '</td><td style="font-size:12px;color:var(--text-secondary)">' + UI.formatDate(c2.updatedAt) + '</td><td>' + (Auth.canEdit() ? '<button class="btn-text" onclick="event.stopPropagation();Pages._exportBom(\'' + c2.id + '\')">导出</button><button class="btn-text" onclick="event.stopPropagation();Pages._editComp(\'' + c2.id + '\')">编辑</button><button class="btn-text danger" onclick="event.stopPropagation();Pages._deleteComp(\'' + c2.id + '\')">删除</button>' : '') + '</td></tr>'; }).join('')) +

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

      // 排序角标 & 点击事件

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

      if (ab) ab.onclick = function() { Pages._editComp(null); };

    }

    render();

  },



  /* ===== 部件BOM导出 ===== */

  _exportBom: function(compId) {

    var comp = Store.getById('components', compId);

    if (!comp) { UI.toast('部件不存在', 'error'); return; }

    var allParts = Store.getAll('parts');

    var allComps = Store.getAll('components');



    // 状态文字映射

    var statusMap = { draft:'草稿', frozen:'冻结', released:'发布', obsolete:'作废' };

    // 类型文字映射

    var typeMap = { component:'部件', part:'零件' };



    // 递归收集 BOM 行（展平）

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

        // 递归子项（仅部件有子项）

        if (childType === 'component' && info.parts && info.parts.length > 0) {

          collect(info.parts, depth + 1);

        }

      });

    };



    // 自身作为第0行

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



    // 递归收集子项

    if (comp.parts && comp.parts.length > 0) {

      collect(comp.parts, 1);

    }



    // 生成 CSV

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

    // 清理文件名非法字符

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

  },



  _viewComp: function(id) {

    var comp = Store.getById('components', id);

    if (!comp) return;

    var ap = Store.getAll('parts');

    var ac = Store.getAll('components');

    console.log('[DEBUG _viewComp] comp.id:', id, '| parts count:', (comp.parts||[]).length, '| parts:', JSON.stringify(comp.parts));

    console.log('[DEBUG _viewComp] ac[0]:', ac[0] ? ac[0].id : 'none', '| ac[1]:', ac[1] ? ac[1].id : 'none');

    // 按编码升序排序子项列表

    if (comp.parts && comp.parts.length > 0) {

      comp.parts.sort(function(a, b) {

        var typeA = a.childType || 'part';

        var typeB = b.childType || 'part';

        // 根据 childType 读取正确的 ID 字段

        var refIdA = typeA === 'component' ? (a.componentId || '') : (a.partId || '');

        var refIdB = typeB === 'component' ? (b.componentId || '') : (b.partId || '');

        var infoA = typeA === 'part' ? ap.find(function(x) { return x.id === refIdA; }) : ac.find(function(x) { return x.id === refIdA; });

        var infoB = typeB === 'part' ? ap.find(function(x) { return x.id === refIdB; }) : ac.find(function(x) { return x.id === refIdB; });

        var codeA = (infoA && infoA.code) || '';

        var codeB = (infoB && infoB.code) || '';

        return codeA.localeCompare(codeB);

      });

    }



    // 构建子项树形结构（递归）

    var buildTree = function(items, depth, maxDepth) {

      if (!items || items.length === 0 || depth > maxDepth) return '';

      var html = '';

      items.forEach(function(p) {

        var type = p.childType || 'part';

        // 根据 childType 读取正确的 ID 字段

        var refId = type === 'component' ? (p.componentId || '') : (p.partId || '');

        console.log('[DEBUG buildTree] type:', type, '| refId:', refId, '| ac.length:', ac.length, '| ac[0].id:', ac[0] ? ac[0].id : 'none');

        var info = null;

        var subItems = null;

        if (type === 'part') {

          info = ap.find(function(x) { return x.id === refId; });

        } else {

          info = ac.find(function(x) { return x.id === refId; });

          if (info && info.parts) subItems = info.parts; // 部件有子项

        }

        if (!info) return;

        var icon = type === 'part' ? '🔧' : '📦';

        var label = type === 'part' ? '零件' : '部件';

        var indent = (depth - 1) * 20;

        var hasChildren = (type === 'component' && subItems && subItems.length > 0);

        var toggle = hasChildren ? '<span class="tree-toggle" onclick="event.stopPropagation();var c=this.closest(\'.tree-item\').nextElementSibling;c.style.display=c.style.display===\'none\'?\'block\':\'none\';this.textContent=this.textContent===\'▶\'?\'▼\':\'▶\'">▶</span> ' : '';

        html += '<div class="tree-item" style="display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid #e8e8e8;margin-left:' + indent + 'px"><span style="width:50px;flex-shrink:0">' + depth + '</span><span style="width:80px;flex-shrink:0">' + toggle + icon + ' ' + label + '</span><span style="flex:1">' + info.code + '</span><span style="flex:1">' + info.name + '</span><span style="flex:1">' + (info.spec || '-') + '</span><span style="width:60px;text-align:center">' + (info.version||'A') + '</span><span style="width:60px;text-align:center">' + UI.statusTag(info.status) + '</span><span style="width:60px;text-align:right">' + p.quantity + '</span></div>';

        if (hasChildren) {

          html += '<div class="tree-children" style="display:none">' + buildTree(subItems, depth + 1, maxDepth) + '</div>';

        }

      });

      return html;

    };



    // 构建表格视图数据（展平）

    var tableRows = [];

    var flattenTree = function(items, level) {

      if (!items) return;

      items.forEach(function(p) {

        var type = p.childType || 'part';

        // 根据 childType 读取正确的 ID 字段

        var refId = type === 'component' ? (p.componentId || '') : (p.partId || '');

        console.log('[DEBUG buildTree] type:', type, '| refId:', refId, '| ac.length:', ac.length, '| ac[0].id:', ac[0] ? ac[0].id : 'none');

        var info = null;

        if (type === 'part') {

          info = ap.find(function(x) { return x.id === refId; });

        } else {

          info = ac.find(function(x) { return x.id === refId; });

        }

        if (!info) return;

        var icon = type === 'part' ? '🔧' : '📦';

        var label = type === 'part' ? '零件' : '部件';

        tableRows.push({ level: level, icon: icon, label: label, code: info.code, name: info.name, spec: info.spec||'-', version: info.version||'A', status: info.status, quantity: p.quantity });

        // 递归子项

        if (type === 'component' && info.parts && info.parts.length > 0) {

          flattenTree(info.parts, level + 1);

        }

      });

    };

    flattenTree(comp.parts, 1);

    var tableHtml = tableRows.map(function(r) { return '<tr><td style="padding-left:' + (r.level * 15) + 'px">' + r.level + '</td><td>' + r.icon + ' ' + r.label + '</td><td>' + r.code + '</td><td>' + r.name + '</td><td>' + r.spec + '</td><td>' + r.version + '</td><td>' + UI.statusTag(r.status) + '</td><td>' + r.quantity + '</td></tr>'; }).join('');



    // 修订记录

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



    UI.modal('部件详情 - ' + comp.name,

      '<div class="bom-info-grid" style="margin-bottom:20px"><div class="bom-info-item"><div class="label">件号</div><div class="value">' + _esc(comp.code) + '</div></div><div class="bom-info-item"><div class="label">版本</div><div class="value">' + (comp.version||'A') + '</div></div><div class="bom-info-item"><div class="label">状态</div><div class="value">' + UI.statusTag(comp.status) + '</div></div></div>' +

      '<h4 style="margin-bottom:12px">子项列表 (' + (comp.parts||[]).length + '种)</h4>' +

      '<div class="tabs" id="comp-tabs"><div class="tab active" data-t="tree">🌲 树形视图</div><div class="tab" data-t="table">📊 表格视图</div><div class="tab" data-t="attachment">📎 附件</div></div>' +

      '<div id="comp-tree-view"><div class="tree-view" style="max-height:400px;overflow-y:auto;color:#333"><div style="display:grid;grid-template-columns:50px 80px 1fr 1fr 1fr 60px 60px 60px;padding:8px 10px;background:#fafafa;font-weight:600;border-bottom:1px solid #e8e8e8"><span>层级</span><span>类型</span><span>件号</span><span>名称</span><span>规格</span><span>版本</span><span>状态</span><span>用量</span></div>' + buildTree(comp.parts, 1, 6) + '</div></div>' +

      '<div id="comp-table-view" style="display:none"><div class="table-wrapper" style="max-height:400px;overflow-y:auto;color:#333"><table><thead><tr><th style="width:50px;font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">层级</th><th style="width:80px;font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">类型</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">件号</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">名称</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">规格</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">版本</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">状态</th><th style="font-weight:600;padding:8px 10px;border-bottom:1px solid #e8e8e8;text-align:left">用量</th></tr></thead><tbody>' + (tableHtml || '<tr><td colspan="8" style="text-align:center;color:#333">暂无数据</td></tr>') + '</tbody></table></div></div>' +

      '<div id="comp-attachment-view" style="display:none"><div class="attachment-view" style="padding:16px;background:#f9f9f9;border-radius:4px;margin-top:8px"><div class="form-row"><div class="form-group"><label>源文件</label><input type="text" value="' + _esc(comp.sourceFile||'') + '" readonly>' + (comp.sourceFile_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.sourceFile_data||'') + '\',\'' + _esc(comp.sourceFile||'附件') + '\')">⬇ 下载</button>' : '') + '</div><div class="form-group"><label>图纸</label><input type="text" value="' + _esc(comp.drawing||'') + '" readonly>' + (comp.drawing_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.drawing_data||'') + '\',\'' + _esc(comp.drawing||'附件') + '\')">⬇ 下载</button>' : '') + '</div></div><div class="form-row"><div class="form-group"><label>STP</label><input type="text" value="' + _esc(comp.stp||'') + '" readonly>' + (comp.stp_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.stp_data||'') + '\',\'' + _esc(comp.stp||'附件') + '\')">⬇ 下载</button>' : '') + '</div><div class="form-group"><label>PDF</label><input type="text" value="' + _esc(comp.pdf||'') + '" readonly>' + (comp.pdf_data ? '<button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.pdf_data||'') + '\',\'' + _esc(comp.pdf||'附件') + '\')">⬇ 下载</button>' : '') + '</div></div></div></div>' +

      revHtml,

      { large: true });

    // Tab切换逻辑

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

      '<div class="form-group"><label>规格</label><input type="text" id="fc-spec" value="' + _esc(comp ? comp.spec||'' : '') + '"' + ro + '></div>' +

      '<div class="form-group"><label>状态</label><select id="fc-st"' + roExceptStatus + '><option value="draft"' + (!comp || comp.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="frozen"' + (comp && comp.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (comp && comp.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (comp && comp.status === 'obsolete' ? ' selected' : '') + '>作废</option></select></div>' +

      '<div class="form-row"><div class="form-group"><label>源文件</label>' + (comp && comp.sourceFile_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.sourceFile || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.sourceFile_data||'') + '\',\'' + _esc(comp.sourceFile||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deleteCompAttachment(this,\'sourceFile\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-source" accept="*/*" onchange="Pages._onCompFileChange(this,\'fc-source\')"' + ro + '></div><div class="form-group"><label>图纸</label>' + (comp && comp.drawing_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.drawing || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.drawing_data||'') + '\',\'' + _esc(comp.drawing||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deleteCompAttachment(this,\'drawing\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-drawing" accept="*/*" onchange="Pages._onCompFileChange(this,\'fc-drawing\')"' + ro + '></div></div>' +

      '<div class="form-row"><div class="form-group"><label>STP</label>' + (comp && comp.stp_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.stp || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.stp_data||'') + '\',\'' + _esc(comp.stp||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deleteCompAttachment(this,\'stp\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-stp" accept="*/*" onchange="Pages._onCompFileChange(this,\'fc-stp\')"' + ro + '></div><div class="form-group"><label>PDF</label>' + (comp && comp.pdf_data ? '<div class="file-preview"><span class="file-name">' + _esc(comp.pdf || '') + '</span><button type="button" class="btn-link" onclick="UI._downloadBase64(\'' + (comp.pdf_data||'') + '\',\'' + _esc(comp.pdf||'附件') + '\')">下载</button><button type="button" class="btn-link" style="color:#ff4d4f" onclick="Pages._deleteCompAttachment(this,\'pdf\')">删除</button></div>' : '<div class="file-preview"><span class="file-name empty">未上传</span></div>') + '<input type="file" id="fc-pdf" accept="*/*" onchange="Pages._onCompFileChange(this,\'fc-pdf\')"' + ro + '></div></div>' +

      '<div class="form-group full"><label>备注</label><textarea id="fc-rem"' + ro + '>' + _esc(comp ? comp.remark||'' : '') + '</textarea></div>' +

      '<h4 style="margin:8px 0 12px">子项列表</h4><div id="child-items-container">' + this._renderChildItems(comp) + '</div>' + (canE ? '<button class="btn-outline btn-sm" id="btn-add-child">＋ 添加子项</button>' : '<div style="color:#faad14;font-size:12px;margin-top:8px">⚠️ 当前状态锁定，子项不可修改</div>') +

      (isNotDraft ? '<div style="margin-top:10px;color:#faad14;font-size:12px">⚠️ 当前状态为"' + (comp.status === 'frozen' ? '冻结' : comp.status === 'released' ? '发布' : '作废') + '"，字段已锁定。' + (isFrozen ? '管理员和工程师可修改状态。' : '仅管理员可修改状态。') + '</div>' : ''),

      { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button>' + (comp && (comp.status === 'released' || comp.status === 'obsolete') ? '<button class="btn-primary" onclick="Pages._upgradeComp(\'' + comp.id + '\')">升版</button>' : '') + '<button class="btn-primary" id="btn-sc">保存</button>', large: true });

    var self = this;

    window._editCompData = JSON.parse(JSON.stringify(comp && comp.parts ? comp.parts : []));

    document.getElementById('btn-add-child').onclick = function() { self._showChildSelector(id); };

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

        // 对于部件类型子项，保留 componentId；对于零件类型子项，保留 partId

        if (item.childType === 'component') {

          return {

            childType: 'component',

            componentId: item.componentId || '',

            quantity: item.quantity || 1

          };

        } else {

          return {

            childType: 'part',

            partId: item.partId || '',

            quantity: item.quantity || 1

          };

        }

      }).filter(function(p) { return p.partId || p.componentId; });

      var oldV = comp ? (comp.version || 'A') : 'A';

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

          // 生成修订记录：对比修改前后的字段

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

          // 文件数据变更

          var _compFileDataKeys = ['sourceFile','drawing','stp','pdf'];

          _compFileDataKeys.forEach(function(f) {

            var oldData = comp[f + '_data'] || '';

            var newData = data[f + '_data'] || '';

            if (oldData !== newData && !_compChanges.find(function(c) { return c.field === (_compFieldLabels[f] || f); })) {

              _compChanges.push({ field: _compFieldLabels[f] || f, oldVal: oldData ? '有文件' : '无', newVal: newData ? '有文件' : '无' });

            }

          });

          // 子项变更检测

          var oldPartsJson = JSON.stringify(comp.parts || []);

          var newPartsJson = JSON.stringify(data.parts || []);

          if (oldPartsJson !== newPartsJson) {

            _compChanges.push({ field: '子项列表', oldVal: (comp.parts||[]).length + '项', newVal: (data.parts||[]).length + '项' });

          }

          if (_compChanges.length > 0) {

            var compRevisions = comp.revisions || [];

            compRevisions.push({

              date: Date.now(),

              author: Auth.getUser() ? Auth.getUser().realName : '未知',

              changes: _compChanges

            });

            data.revisions = compRevisions;

          }

          Store.update('components', id, data); Store.addLog('编辑部件', '修改部件 ' + code); UI.toast('部件更新成功', 'success');

        } else {

          data.revisions = [];

          Store.add('components', data); Store.addLog('新增部件', '新增部件 ' + code + ' - ' + name); UI.toast('部件新增成功', 'success');

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



  // 渲染子项列表

  _renderChildItems: function(comp) {

    // 优先使用编辑缓存中的数据（实时状态），否则使用传入对象的 parts

    var items = (window._editCompData && window._editCompData.length > 0)

      ? window._editCompData

      : (comp && comp.parts ? comp.parts : []);

    if (items.length === 0) {

      return '<p style="color:var(--text-light);font-size:13px;padding:8px 0">暂无子项，请点击"添加子项"添加</p>';

    }

    var ap = Store.getAll('parts');

    var ac = Store.getAll('components');

    // 权限检查：发布/作废状态下仅管理员可修改子项

    var user = Auth.getUser();

    var isAdmin = user && user.role === 'admin';

    var compStatus = comp ? comp.status : 'draft'; // 新增部件视为草稿

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

      var name = info.name || '';

      var code = info.code || '';

      var spec = info.spec || '-';

      // 用量输入框：根据权限设置 readonly 和事件

      var inputAttr = readOnly ? ' readonly onclick="UI.alert(\'发布/作废状态的子项仅管理员可修改\')"' : ' onchange="Pages._updateChildItem(' + idx + ', \'quantity\', this.value)"';

      // 移除按钮：根据权限设置 onclick 事件

      var buttonHtml = readOnly 

        ? '<button class="btn-text danger btn-sm" onclick="UI.alert(\'发布/作废状态的子项仅管理员可移除\')">移除</button>'

        : '<button class="btn-text danger btn-sm" onclick="Pages._removeChildItem(' + idx + ')">移除</button>';

      html += '<tr>' +

        '<td>' + icon + ' ' + typeLabel + '</td>' +

        '<td>' + code + '</td>' +

        '<td>' + name + '</td>' +

        '<td style="font-size:12px;color:#888">' + (info.version || 'A') + '</td>' +

        '<td>' + UI.statusTag(info.status) + '</td>' +

        '<td><input type="number" value="' + (item.quantity || 1) + '" min="1" style="width:60px"' + inputAttr + '></td>' +

        '<td>' + buttonHtml + '</td>' +

        '</tr>';

    });

    html += '</tbody></table>';

    return html;

  },



  // 更新子项数据

  _updateChildItem: function(idx, field, value) {

    if (!window._editCompData) return;

    // 权限检查：发布/作废状态下仅管理员可修改子项

    if (window._editingCompStatus && (window._editingCompStatus === 'released' || window._editingCompStatus === 'obsolete') && !window._editingCompIsAdmin) {

        UI.alert('发布/作废状态的子项仅管理员可修改');

        return;

    }

    if (field === 'quantity') {

      window._editCompData[idx].quantity = parseInt(value) || 1;

    }

  },



  // 移除子项

  _removeChildItem: function(idx) {

    if (!window._editCompData) return;

    // 权限检查：发布/作废状态下仅管理员可移除子项

    if (window._editingCompStatus && (window._editingCompStatus === 'released' || window._editingCompStatus === 'obsolete') && !window._editingCompIsAdmin) {

        UI.alert('发布/作废状态的子项仅管理员可移除');

        return;

    }

    window._editCompData.splice(idx, 1);

    // 优先刷新选择器（如果在打开状态），同时更新主模态框

    if (typeof window._refreshChildSelector === 'function') {

      window._refreshChildSelector();

    } else {

      var container = document.getElementById('child-items-container');

      if (container) {

        container.innerHTML = Pages._renderChildItems(null);

      }

    }

  },



  // 显示子项选择器（搜索界面）- 使用独立覆盖层，不影响主模态框 DOM

  _showChildSelector: function(compId) {

    var ap = Store.getAll('parts');

    var ac = Store.getAll('components');

    // 过滤掉自身（防止循环引用）

    if (compId) {

      ac = ac.filter(function(c) { return c.id !== compId; });

    }

    var currentIds = (window._editCompData || []).map(function(item) {

      return item.partId || item.componentId || '';

    });

    var filteredParts = ap.filter(function(p) { return currentIds.indexOf(p.id) < 0; });

    var filteredComps = ac.filter(function(c) { return currentIds.indexOf(c.id) < 0; });



    // 保存搜索状态到全局，供 _addChildItem 和 _refreshChildSelector 使用

    window._childSelectorState = {

      filteredParts: filteredParts,

      filteredComps: filteredComps

    };



    var self = this;



    // 渲染选择器内嵌的已选子项列表（用于在选择器中实时显示已添加的项）

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

        // DEBUG

        console.log('[DEBUG renderSelectorChildItems] idx=' + idx, 'type=' + type, 'refId=' + refId, 'info=' + (info ? info.code : 'NULL'), 'ac.length=' + ac.length, 'ac-ids=' + ac.map(function(c){return c.id;}).join(','));

        if (!info) return;

        var icon = type === 'part' ? '🔧' : '📦';

        var label = type === 'part' ? '零件' : '部件';

        h += '<tr style="border-bottom:1px solid #f0f0f0">';

        h += '<td style="padding:4px 6px;font-size:12px"><span style="font-size:11px;color:#888">' + icon + ' ' + label + '</span></td>';

        h += '<td style="padding:4px 6px;font-size:12px">' + (info.code||'') + '</td>';

        h += '<td style="padding:4px 6px;font-size:12px">' + (info.name||'') + '</td>';

        h += '<td style="padding:4px 6px;font-size:12px;color:#888">' + (info.version || 'A') + '</td>';

        h += '<td style="padding:4px 6px;font-size:12px">' + UI.statusTag(info.status) + '</td>';

        h += '<td style="text-align:center;padding:2px 4px"><input type="number" value="' + (item.quantity||1) + '" min="1" style="width:40px;font-size:12px;padding:2px 4px" onchange="Pages._updateChildItem(' + idx + ',\'quantity\',this.value)"></td>';



        h += '<td style="text-align:center"><button class="btn-text danger" style="font-size:12px;padding:2px 4px" onclick="Pages._removeChildItem(' + idx + ')">×</button></td>';

        h += '</tr>';

      });

      h += '</tbody></table>';

      container.innerHTML = h;

    }



    // 动态创建独立的覆盖层（不触动 UI.modal 的 modal-body）

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



    // 初始渲染已选子项

    renderSelectorChildItems();



    // 关闭按钮

    document.getElementById('cs-close').onclick = function() {

      overlay.remove();

      // 选择器关闭时，将最终列表写回主模态框

      var mainContainer = document.getElementById('child-items-container');

      if (mainContainer) {

        mainContainer.innerHTML = Pages._renderChildItems(null);

      }

      window._childSelectorState = null;

    };

    // 点击遮罩也关闭

    overlay.onclick = function(e) {

      if (e.target === overlay) {

        overlay.remove();

        var mainContainer = document.getElementById('child-items-container');

        if (mainContainer) {

          mainContainer.innerHTML = Pages._renderChildItems(null);

        }

        window._childSelectorState = null;

      }

    };



    // 渲染搜索结果

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

        html2 += '<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:7px 10px;font-size:13px"><span style="font-size:12px;color:#888">' + icon + ' ' + typeLabel + '</span></td><td style="padding:7px 10px;font-size:13px">' + d.code + '</td><td style="padding:7px 10px;font-size:13px">' + d.name + '</td><td style="padding:7px 10px;font-size:13px;color:#888">' + (d.version || 'A') + '</td><td style="padding:7px 10px;font-size:13px">' + UI.statusTag(d.status) + '</td><td style="text-align:center;padding:7px 10px"><button class="btn-primary btn-sm" onclick="Pages._addChildItem(\'' + item.type + '\',\'' + d.id + '\')">添加</button></td></tr>';

      });

      html2 += '</tbody></table>';

      container.innerHTML = html2;

    }



    // 刷新选择器（供 _addChildItem 和 _removeChildItem 调用）

    window._refreshChildSelector = function() {

      var kw = document.getElementById('cs-kw') ? document.getElementById('cs-kw').value : '';

      var tf = document.getElementById('cs-type') ? document.getElementById('cs-type').value : 'all';

      renderResults(kw, tf);

      // 刷新选择器内嵌的已选子项列表

      renderSelectorChildItems();

      // 同时更新主模态框的子项列表（以防主模态框可见）

      var mainContainer = document.getElementById('child-items-container');

      if (mainContainer) {

        mainContainer.innerHTML = Pages._renderChildItems(null);

      }

    };



    document.getElementById('cs-kw').oninput = function() { renderResults(this.value, document.getElementById('cs-type').value); };

    document.getElementById('cs-type').onchange = function() { renderResults(document.getElementById('cs-kw').value, this.value); };

    renderResults('', 'all');

  },



  // 添加子项

  _addChildItem: function(type, refId) {

    if (!window._editCompData) window._editCompData = [];

    // 避免重复添加

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



    // 从搜索列表中移除已添加的项目

    var state = window._childSelectorState;

    if (state) {

      if (type === 'part') {

        state.filteredParts = state.filteredParts.filter(function(p) { return p.id !== refId; });

      } else {

        state.filteredComps = state.filteredComps.filter(function(c) { return c.id !== refId; });

      }

    }



    // 刷新搜索结果 + 主模态框子项列表（不关闭选择器）

    if (typeof window._refreshChildSelector === 'function') {

      window._refreshChildSelector();

    }

  },



  _deleteComp: function(id) {

    var comp = Store.getById('components', id);

    if (!comp) return;

    var isAdmin = Auth.getUser() && Auth.getUser().role === 'admin';

    if ((comp.status === 'released' || comp.status === 'obsolete') && !isAdmin) { UI.alert('"发布"和"作废"状态的部件仅管理员可删除'); return; }

    // 检查其他部件是否引用

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

    // 检查 BOM 引用

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

    // 检查是否存在更新版本

    var allComps = Store.getAll('components');

    var newerVersions = allComps.filter(function(c) {

        return c.code === comp.code && c.id !== id && (c.version || 'A').charCodeAt(0) > (comp.version || 'A').charCodeAt(0);

    });

    if (newerVersions.length > 0) {

        UI.alert('该部件不是最新版本，不能被删除');

        return;

    }

    UI.confirm('确定要删除部件 <strong>' + comp.code + ' - ' + comp.name + '</strong> 吗？', function() {

      // 直接从本地删除并入队（skipSync=false），联网后后台队列自动同步到服务器

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

    // 只能对 released 或 obsolete 状态的部件进行升版

    if (oldComp.status !== 'released' && oldComp.status !== 'obsolete') { UI.toast('只有"发布"或"作废"状态的部件可以升版', 'warning'); return; }

    // 检查是否是最新版本：查找同编码的其他部件

    var allComps = Store.getAll('components').filter(function(c) { return c.code === oldComp.code; });

    var maxV = allComps.reduce(function(max, c) { var v = c.version || 'A'; var cv = v.charCodeAt(0); return cv > max ? cv : max; }, 0);

    if ((oldComp.version || 'A').charCodeAt(0) < maxV) { UI.alert('该部件存在更新版本，不能重复升版'); return; }

    // 计算新版本号：A->B->C->D...

    var v = oldComp.version || 'A';

    var newV = String.fromCharCode(v.charCodeAt(0) + 1);

    if (newV > 'Z') { UI.toast('版本号已超过Z，不再支持升版', 'error'); return; }

    // 生成新部件，编码相同（通过版本号区分）

    var newComp = JSON.parse(JSON.stringify(oldComp));

    newComp.id = _uuid();

    newComp.version = newV;

    newComp.status = 'draft'; // 新版本默认为草稿

    newComp.createdAt = Date.now();

    newComp.updatedAt = Date.now();

    // 构建修订记录：记录升版操作

    var compRevisions = oldComp.revisions || [];

    compRevisions.push({ date: Date.now(), author: (Auth.getUser() ? Auth.getUser().realName : '未知'), changes: [{ field: '版本', oldVal: oldComp.version, newVal: newV }] });

    oldComp.revisions = compRevisions;

    newComp.revisions = []; // 新版本从空白修订记录开始

    // 保存

    Store.update('components', id, oldComp); // 更新原部件的历史

    Store.add('components', newComp); // 添加新版本部件

    Store.addLog('部件升版', '部件 ' + oldComp.code + ' 从版本' + oldComp.version + ' 升版至 ' + newV);

    UI.toast('升版成功，新版本: ' + newV, 'success');

    UI.closeModal();

    Router.render();

    } catch(e) { console.error('升版错误:', e); UI.toast('升版失败: ' + e.message, 'error'); }

  },



  /* ===== BOM ===== */

  bom: function(c) {
    // BOM管理：对比与反查两个独立界面
    var currentCompareData = null; // 存储当前对比结果，用于导出
    c.innerHTML = 
      '<div class="bom-management-container">' +
        '<div class="bom-view-switcher">' +
          '<button class="view-switch-btn active" data-view="compare">📊 BOM对比</button>' +
          '<button class="view-switch-btn" data-view="search">🔍 BOM反查</button>' +
        '</div>' +
        
        '<div class="bom-view active" id="view-compare">' +
          '<div class="view-header">' +
            '<h3>BOM对比</h3>' +
            '<p class="view-description">选择两个装配体版本，对比其BOM结构差异</p>' +
          '</div>' +
          '<div class="compare-header">' +
            '<div class="version-selector left-selector">' +
              '<label>左侧版本</label>' +
              '<select id="left-assembly" class="form-select"><option>加载中...</option></select>' +
            '</div>' +
            '<div class="compare-toolbar">' +
              '<button class="btn-primary" id="compare-btn">开始对比</button>' +
              '<button class="btn-outline" id="expand-all">全展开</button>' +
              '<button class="btn-outline" id="collapse-all">全折叠</button>' +
              '<label class="checkbox-label"><input type="checkbox" id="show-changes-only"> 只显示变更</label>' +
              '<button class="btn-outline" id="export-csv">📥 导出CSV</button>' +
            '</div>' +
            '<div class="version-selector right-selector">' +
              '<label>右侧版本</label>' +
              '<select id="right-assembly" class="form-select"><option>加载中...</option></select>' +
            '</div>' +
          '</div>' +
          '<div class="compare-body">' +
            '<div class="compare-table left-table" id="left-table"></div>' +
            '<div class="compare-divider"></div>' +
            '<div class="compare-table right-table" id="right-table"></div>' +
          '</div>' +
          '<div class="compare-footer">' +
            '<div class="summary" id="compare-summary">选择两个装配体版本进行对比</div>' +
          '</div>' +
        '</div>' +
        
        '<div class="bom-view" id="view-search">' +
          '<div class="card" style="margin-bottom:20px">' +
            '<input type="text" id="bom-search-input" placeholder="输入件号或名称搜索零件/部件..." autocomplete="off" class="form-input" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box" />' +
            '<div id="bom-search-results" style="margin-top:8px;display:none;max-height:320px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px"></div>' +
          '</div>' +
          '<div id="bom-search-tree"></div>' +
        '</div>' +
      '</div>';
    
    // 初始化视图切换
    var viewBtns = c.querySelectorAll('.view-switch-btn');
    viewBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var view = this.getAttribute('data-view');
        c.querySelectorAll('.view-switch-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        c.querySelectorAll('.bom-view').forEach(function(viewEl) {
          viewEl.classList.remove('active');
        });
        c.querySelector('#view-' + view).classList.add('active');
      });
    });
    
    // 加载装配体列表
    var leftSelect = c.querySelector('#left-assembly');
    var rightSelect = c.querySelector('#right-assembly');
    var assemblies = Store.getAll('components'); // 部件即装配体
    leftSelect.innerHTML = '';
    rightSelect.innerHTML = '';
    assemblies.forEach(function(assy) {
      var option = '<option value="' + assy.id + '">' + assy.code + ' - ' + assy.name + ' (' + assy.version + ')</option>';
      leftSelect.innerHTML += option;
      rightSelect.innerHTML += option;
    });
    
    // 对比按钮事件
    c.querySelector('#compare-btn').addEventListener('click', async function() {
      var leftId = leftSelect.value;
      var rightId = rightSelect.value;
      if (!leftId || !rightId) {
        UI.toast('请选择左右两侧的装配体', 'warning');
        return;
      }
      if (leftId === rightId) {
        UI.toast('请选择两个不同的装配体', 'warning');
        return;
      }
      
      UI.toast('正在对比...', 'info');
      var compareBtn = this;
      compareBtn.disabled = true;
      compareBtn.textContent = '对比中...';
      
      try {
        // 认证由 API._fetch 自动处理
        
        // 构建请求
        var requestBody = {
          left_assembly_id: leftId,
          right_assembly_id: rightId,
          options: {
            include_unchanged: true,
            max_depth: 10
          }
        };
        
        // 调用后端对比API（使用API._fetch自动处理认证和错误）
        var compareData = await API._fetch('POST', '/bom/compare', requestBody);
        
        // 渲染对比结果
        renderCompareResults(compareData.comparison, leftId, rightId);
        
        // 更新摘要
        updateCompareSummary(compareData.summary);
        
        UI.toast('对比完成', 'success');
      } catch (error) {
        console.error('对比失败:', error);
        UI.toast('对比失败: ' + error.message, 'error');
      } finally {
        compareBtn.disabled = false;
        compareBtn.textContent = '开始对比';
      }
    });
    
    // 渲染对比结果到左右表格
    function renderCompareResults(compareData, leftAssemblyId, rightAssemblyId) {
      currentCompareData = compareData; // 存储用于导出
      var leftTable = c.querySelector('#left-table');
      var rightTable = c.querySelector('#right-table');
      
      // 清空表格
      leftTable.innerHTML = '';
      rightTable.innerHTML = '';
      
      if (!compareData || compareData.length === 0) {
        leftTable.innerHTML = '<div class="empty-table">无对比数据</div>';
        rightTable.innerHTML = '<div class="empty-table">无对比数据</div>';
        return;
      }
      
      // 获取装配体信息用于显示
      var leftAssembly = Store.getById('components', leftAssemblyId);
      var rightAssembly = Store.getById('components', rightAssemblyId);
      var leftTitle = leftAssembly ? leftAssembly.code + ' - ' + leftAssembly.name + ' (' + leftAssembly.version + ')' : '左侧装配体';
      var rightTitle = rightAssembly ? rightAssembly.code + ' - ' + rightAssembly.name + ' (' + rightAssembly.version + ')' : '右侧装配体';
      
      // 创建表格头部
      var leftHeader = '<div class="compare-table-header"><strong>' + leftTitle + '</strong></div>';
      var rightHeader = '<div class="compare-table-header"><strong>' + rightTitle + '</strong></div>';
      
      // 创建表格内容
      var leftRows = '';
      var rightRows = '';
      
      compareData.forEach(function(item, index) {
        var leftItem = item.left;
        var rightItem = item.right;
        var changeType = item.change_type;
        var level = item.level || 0;
        
        // 根据变更类型确定行样式
        var rowClass = 'compare-row';
        var changeColor = '';
        switch (changeType) {
          case 'added': changeColor = 'added-row'; break;
          case 'removed': changeColor = 'removed-row'; break;
          case 'modified': changeColor = 'modified-row'; break;
          case 'unchanged': changeColor = 'unchanged-row'; break;
          default: changeColor = '';
        }
        
        // 缩进样式
        var indent = level * 20;
        var indentStyle = 'margin-left: ' + indent + 'px;';
        
        // 左侧行
        if (leftItem) {
          var leftDetail = leftItem.detail || {};
          leftRows += '<div class="' + rowClass + ' ' + changeColor + '" style="' + indentStyle + '">' +
            '<div class="compare-cell"><strong>' + (leftDetail.code || '') + '</strong></div>' +
            '<div class="compare-cell">' + (leftDetail.name || '') + '</div>' +
            '<div class="compare-cell">' + (leftItem.quantity || '') + '</div>' +
            '<div class="compare-cell">' + (leftItem.child_type === 'part' ? '零件' : '部件') + '</div>' +
            '<div class="compare-cell">' + (leftDetail.version || '') + '</div>' +
            '<div class="compare-cell">' + (changeType === 'added' ? '新增' : changeType === 'removed' ? '删除' : changeType === 'modified' ? '修改' : '未变') + '</div>' +
            '</div>';
        } else {
          // 左侧缺失（仅在右侧存在）
          leftRows += '<div class="' + rowClass + ' ' + changeColor + '" style="' + indentStyle + '">' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">' + (changeType === 'added' ? '新增' : changeType === 'removed' ? '删除' : changeType === 'modified' ? '修改' : '未变') + '</div>' +
            '</div>';
        }
        
        // 右侧行
        if (rightItem) {
          var rightDetail = rightItem.detail || {};
          rightRows += '<div class="' + rowClass + ' ' + changeColor + '" style="' + indentStyle + '">' +
            '<div class="compare-cell"><strong>' + (rightDetail.code || '') + '</strong></div>' +
            '<div class="compare-cell">' + (rightDetail.name || '') + '</div>' +
            '<div class="compare-cell">' + (rightItem.quantity || '') + '</div>' +
            '<div class="compare-cell">' + (rightItem.child_type === 'part' ? '零件' : '部件') + '</div>' +
            '<div class="compare-cell">' + (rightDetail.version || '') + '</div>' +
            '<div class="compare-cell">' + (changeType === 'added' ? '新增' : changeType === 'removed' ? '删除' : changeType === 'modified' ? '修改' : '未变') + '</div>' +
            '</div>';
        } else {
          // 右侧缺失（仅在左侧存在）
          rightRows += '<div class="' + rowClass + ' ' + changeColor + '" style="' + indentStyle + '">' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">—</div>' +
            '<div class="compare-cell">' + (changeType === 'added' ? '新增' : changeType === 'removed' ? '删除' : changeType === 'modified' ? '修改' : '未变') + '</div>' +
            '</div>';
        }
      });
      
      // 组装表格
      leftTable.innerHTML = leftHeader + '<div class="compare-table-body">' + leftRows + '</div>';
      rightTable.innerHTML = rightHeader + '<div class="compare-table-body">' + rightRows + '</div>';
    }
    
    // 更新对比摘要
    function updateCompareSummary(compareData) {
      var summaryEl = c.querySelector('#compare-summary');
      if (!summaryEl) return;
      
      // 判断是摘要对象还是对比数组
      var summaryText = '';
      if (compareData && typeof compareData === 'object' && !Array.isArray(compareData)) {
        // 摘要对象
        var total = compareData.total || 0;
        var added = compareData.added || 0;
        var removed = compareData.deleted || compareData.removed || 0;
        var modified = compareData.modified || 0;
        var unchanged = compareData.unchanged || 0;
        summaryText = '共 ' + total + ' 项，新增 ' + added + ' 项，删除 ' + removed + ' 项，修改 ' + modified + ' 项，未变 ' + unchanged + ' 项';
      } else if (Array.isArray(compareData)) {
        // 对比数组（旧格式）
        if (compareData.length === 0) {
          summaryText = '无对比数据';
        } else {
          var added = 0, removed = 0, modified = 0, unchanged = 0;
          compareData.forEach(function(item) {
            switch (item.change_type) {
              case 'added': added++; break;
              case 'removed': removed++; break;
              case 'modified': modified++; break;
              case 'unchanged': unchanged++; break;
            }
          });
          var total = compareData.length;
          summaryText = '共 ' + total + ' 项，新增 ' + added + ' 项，删除 ' + removed + ' 项，修改 ' + modified + ' 项，未变 ' + unchanged + ' 项';
        }
      } else {
        summaryText = '无对比数据';
      }
      
      summaryEl.innerHTML = summaryText;
    }
    
    // 全展开/全折叠按钮事件
    c.querySelector('#expand-all').addEventListener('click', function() {
      var rows = c.querySelectorAll('.compare-row');
      rows.forEach(function(row) {
        row.style.display = 'grid';
      });
      UI.toast('已展开所有行', 'info');
    });
    
    c.querySelector('#collapse-all').addEventListener('click', function() {
      // 只显示顶级行（level=0）
      var rows = c.querySelectorAll('.compare-row');
      rows.forEach(function(row) {
        var indent = parseInt(row.style.marginLeft) || 0;
        if (indent === 0) {
          row.style.display = 'grid';
        } else {
          row.style.display = 'none';
        }
      });
      UI.toast('已折叠所有子项', 'info');
    });
    
    // 只显示变更复选框事件
    c.querySelector('#show-changes-only').addEventListener('change', function(e) {
      var showChangesOnly = e.target.checked;
      var rows = c.querySelectorAll('.compare-row');
      rows.forEach(function(row) {
        if (showChangesOnly) {
          if (row.classList.contains('unchanged-row')) {
            row.style.display = 'none';
          } else {
            row.style.display = 'grid';
          }
        } else {
          row.style.display = 'grid';
        }
      });
      UI.toast(showChangesOnly ? '只显示变更项' : '显示所有项', 'info');
    });
    
    // 导出CSV按钮事件
    c.querySelector('#export-csv').addEventListener('click', function() {
      if (!currentCompareData) {
        UI.toast('暂无对比数据，请先执行对比', 'warning');
        return;
      }
      // 生成CSV内容
      var csvRows = [];
      // 表头
      csvRows.push(['层级','变更类型','左侧件号','左侧名称','左侧用量','左侧类型','左侧版本','右侧件号','右侧名称','右侧用量','右侧类型','右侧版本'].join(','));
      
      currentCompareData.forEach(function(item) {
        var left = item.left;
        var right = item.right;
        var changeType = item.change_type;
        var level = item.level || 0;
        
        var leftCode = left && left.detail ? left.detail.code || '' : '';
        var leftName = left && left.detail ? left.detail.name || '' : '';
        var leftQty = left ? left.quantity || '' : '';
        var leftType = left ? (left.child_type === 'part' ? '零件' : '部件') : '';
        var leftVersion = left && left.detail ? left.detail.version || '' : '';
        
        var rightCode = right && right.detail ? right.detail.code || '' : '';
        var rightName = right && right.detail ? right.detail.name || '' : '';
        var rightQty = right ? right.quantity || '' : '';
        var rightType = right ? (right.child_type === 'part' ? '零件' : '部件') : '';
        var rightVersion = right && right.detail ? right.detail.version || '' : '';
        
        // 变更类型中文映射
        var changeTypeMap = {
          'added': '新增',
          'removed': '删除', 
          'modified': '修改',
          'unchanged': '未变'
        };
        var changeTypeText = changeTypeMap[changeType] || changeType;
        
        csvRows.push([
          level,
          changeTypeText,
          leftCode,
          leftName,
          leftQty,
          leftType,
          leftVersion,
          rightCode,
          rightName,
          rightQty,
          rightType,
          rightVersion
        ].map(function(cell) {
          // CSV转义：引号包裹包含逗号、换行或引号的内容
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('\n') || cell.includes('"'))) {
            return '"' + cell.replace(/"/g, '""') + '"';
          }
          return cell;
        }).join(','));
      });
      
      var csvContent = csvRows.join('\n');
      var blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'BOM对比_' + new Date().toISOString().slice(0,10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      UI.toast('CSV导出成功', 'success');
    });
    
    // 初始化BOM反查功能（完整恢复）
    var searchInput = c.querySelector('#bom-search-input');
    var searchResults = c.querySelector('#bom-search-results');
    var searchTree = c.querySelector('#bom-search-tree');
    
    // 防抖计时器
    var searchTimer = null;
    
    // 搜索函数
    function performSearch() {
      var keyword = searchInput.value.trim().toLowerCase();
      if (!keyword) {
        searchResults.style.display = 'none';
        searchTree.innerHTML = '';
        return;
      }
      
      // 搜索零件和部件
      var parts = Store.getAll('parts');
      var comps = Store.getAll('components');
      var all = [];
      
      parts.forEach(function(p) {
        if ((p.code && p.code.toLowerCase().includes(keyword)) || (p.name && p.name.toLowerCase().includes(keyword))) {
          all.push({ id: p.id, code: p.code, name: p.name, version: p.version, status: p.status, _type: 'part' });
        }
      });
      comps.forEach(function(c) {
        if ((c.code && c.code.toLowerCase().includes(keyword)) || (c.name && c.name.toLowerCase().includes(keyword))) {
          all.push({ id: c.id, code: c.code, name: c.name, version: c.version, status: c.status, _type: 'component' });
        }
      });

      if (all.length === 0) {
        searchResults.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-light);font-size:13px">未找到匹配的零件或部件</div>';
        searchResults.style.display = 'block';
        searchTree.innerHTML = '';
        return;
      }

      var html = '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">' +
          '<th style="padding:8px 12px;text-align:left;color:var(--text-secondary);font-weight:500">件号</th>' +
          '<th style="padding:8px 12px;text-align:left;color:var(--text-secondary);font-weight:500">名称</th>' +
          '<th style="padding:8px 12px;text-align:center;color:var(--text-secondary);font-weight:500">类型</th>' +
          '<th style="padding:8px 12px;text-align:center;color:var(--text-secondary);font-weight:500">版本</th>' +
          '<th style="padding:8px 12px;text-align:center;color:var(--text-secondary);font-weight:500">状态</th>' +
        '</tr></thead><tbody>';
      all.forEach(function(item) {
        var ver = item.version || '';
        var statusHtml = item.status ? UI.statusTag(item.status) : '<span style="color:#9ca3af;font-size:12px">-</span>';
        var typeHtml = item._type === 'component'
          ? '<span style="font-size:12px;padding:1px 6px;border-radius:3px;background:#e6f4ff;color:#1677ff;border:1px solid #91caff">部件</span>'
          : '<span style="font-size:12px;padding:1px 6px;border-radius:3px;background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f">零件</span>';
        html += '<tr class="br-part-row" data-id="'+item.id+'" data-type="'+item._type+'" style="cursor:pointer">' +
          '<td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-weight:500">'+item.code+'</td>' +
          '<td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;color:var(--text-secondary)">'+item.name+'</td>' +
          '<td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center">'+typeHtml+'</td>' +
          '<td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:12px;color:var(--text-secondary)">'+(ver||'-')+'</td>' +
          '<td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center">'+statusHtml+'</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      searchResults.innerHTML = html;
      searchResults.style.display = 'block';
      searchTree.innerHTML = '';

      // 绑定点击事件
      c.querySelectorAll('.br-part-row').forEach(function(row) {
        row.onmouseover = function() { this.style.background = '#f0f7ff'; };
        row.onmouseout = function() { this.style.background = ''; };
        row.onclick = function() {
          var rid = this.getAttribute('data-id');
          var rtype = this.getAttribute('data-type');
          searchResults.style.display = 'none';
          doReverse(rid, rtype);
        };
      });
    }
    
    // 输入事件监听（防抖300ms）
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(performSearch, 300);
    });
    
    // 初始隐藏结果列表
    searchResults.style.display = 'none';

    // BOM反查核心函数
    function doReverse(rid, rtype) {
      var entity = (rtype === 'component')
        ? Store.getById('components', rid)
        : Store.getById('parts', rid);
      var comps = Store.getAll('components');
      var partsAll = Store.getAll('parts');
      var allItems = Store.getAll('bom_items') || [];

      // 构建父项索引：childId → [{bomItem, parentEntity}]
      var childToParents = {};
      allItems.forEach(function(item) {
        var key = item.childId || item.child_id;
        if (!key) return;
        if (!childToParents[key]) childToParents[key] = [];
        childToParents[key].push(item);
      });

      var visited = new Set();
      var rootType = rtype || 'part';
      var tree = {
        id: rid,
        name: entity ? entity.name : '?',
        code: entity ? entity.code : '-',
        version: entity ? (entity.version || '') : '',
        status: entity ? (entity.status || '') : '',
        type: rootType,
        level: 0,
        parents: []
      };

      function searchUp(entityId, level) {
        if (!entityId || visited.has(entityId)) return [];
        visited.add(entityId);
        var refs = [];
        var parentItems = childToParents[entityId] || [];
        parentItems.forEach(function(bi) {
          var pt = bi.parentType || bi.parent_type;
          var puid = bi.parentId || bi.parent_id;
          if (!puid) return;
          var parentEntity = (pt === 'assembly' || pt === 'component')
            ? comps.find(function(c){return c.id === puid;})
            : partsAll.find(function(p){return p.id === puid;});
          if (!parentEntity) return;
          var node = {
            id: puid,
            name: parentEntity.name || '?',
            code: parentEntity.code || '-',
            version: parentEntity.version || '',
            status: parentEntity.status || '',
            type: pt,
            level: level,
            bomItem: bi,
            parents: []
          };
          if (pt === 'assembly' || pt === 'component') {
            node.parents = searchUp(puid, level + 1);
          }
          refs.push(node);
        });
        return refs;
      }

      tree.parents = searchUp(rid, 1);

      // 渲染树形结构
      var total = _countTreeNodes(tree);
      var rootLabel = rootType === 'component' ? '部件' : '零件';
      var html = '<div class="stat-card" style="margin-bottom:20px;max-width:400px"><div class="stat-icon '+(total>0?'blue':'gray')+'">🔍</div><div class="stat-info"><div class="label">被引用节点数</div><div class="value">'+(total+1)+'</div></div></div>';

      if (total === 0) {
        html += '<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text-light)">该'+rootLabel+'未被任何部件引用（顶层'+rootLabel+'）</div></div>';
      } else {
        html += '<div class="card"><div id="br-tree">' + _renderTreeNode(tree, true) + '</div></div>';
      }
      searchTree.innerHTML = html;

      // 绑定展开/折叠
      c.querySelectorAll('#br-tree .br-toggle').forEach(function(btn) {
        btn.onclick = function() {
          var node = btn.closest('.br-node');
          var children = node.querySelector('.br-children');
          if (!children) return;
          var open = children.style.display !== 'none';
          children.style.display = open ? 'none' : 'block';
          btn.textContent = open ? '▶' : '▼';
        };
      });
    }

    function _countTreeNodes(node) {
      var count = node.parents ? node.parents.length : 0;
      (node.parents || []).forEach(function(p){ count += _countTreeNodes(p); });
      return count;
    }

    function _renderTreeNode(node, isRoot) {
      var indent = node.level * 24;
      var hasChildren = node.parents && node.parents.length > 0;
      var toggle = hasChildren ? '<button class="br-toggle" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--primary);padding:0 4px;line-height:1">▼</button>' : '<span style="display:inline-block;width:20px"></span>';
      var version = node.version || '';
      var statusHtml = node.status ? UI.statusTag(node.status) : '';
      var levelLabel = '<span style="display:inline-block;min-width:36px;font-size:11px;font-weight:600;color:#fff;background:var(--primary);border-radius:10px;padding:1px 7px;text-align:center">L'+node.level+'</span>';

      var nodeTypeTag = (node.type === 'component' || node.type === 'assembly')
        ? '<span style="margin-right:6px;font-size:11px;padding:1px 5px;border-radius:3px;background:#e6f4ff;color:#1677ff;border:1px solid #91caff">部件</span>'
        : '<span style="margin-right:6px;font-size:11px;padding:1px 5px;border-radius:3px;background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f">零件</span>';
      var html = '<div class="br-node" style="padding-left:'+indent+'px">';
      html += '<div class="br-row" style="display:flex;align-items:center;padding:6px 4px;border-radius:4px;margin-bottom:2px;background:'+(isRoot?'#f0f7ff':'#fafafa')+';border-left:3px solid '+(isRoot?'var(--primary)':'#ddd')+'">' +
        toggle +
        '<span style="margin:0 6px 0 4px">'+levelLabel+'</span>' +
        nodeTypeTag +
        '<span style="font-weight:'+(isRoot?'600':'400')+';margin-right:8px">'+(node.code||'-')+'</span>' +
        '<span style="margin-right:10px;color:var(--text-secondary)">'+(node.name||'?')+'</span>' +
        (version ? '<span style="margin-right:8px;font-size:12px;color:var(--text-secondary)">' + version + '</span>' : '') +
        statusHtml +
      '</div>';

      if (hasChildren) {
        html += '<div class="br-children">';
        node.parents.forEach(function(p){ html += _renderTreeNode(p, false); });
        html += '</div>';
      }
      html += '</div>';
      return html;
    }
},



  /* ===== Users ===== */

  users: function(c) {

    var users = Store.getAll('users');

    var currentUser = Auth.getUser();

    var isAdmin = currentUser && currentUser.role === 'admin';

    c.innerHTML =

      '<div class="page-header"><h2>👥 用户管理</h2><div class="actions"><button class="btn-primary" id="btn-add-u">＋ 新增用户</button></div></div>' +

      '<div class="card"><div class="table-wrapper"><table><thead><tr><th>用户名</th><th>姓名</th><th>角色</th><th>部门</th><th>联系电话</th><th>状态</th><th>操作</th></tr></thead><tbody>' +

      users.map(function(u) {

        var isSelf = currentUser && u.id === currentUser.id;

        var deleteBtn = isAdmin && !isSelf ? '<button class="btn-text danger" onclick="Pages._deleteUser(\'' + u.id + '\')">删除</button>' : '';

        return '<tr><td><strong>' + u.username + '</strong>' + (isSelf ? ' <span style="color:#1890ff;font-size:12px">(我)</span>' : '') + '</td><td>' + u.realName + '</td><td>' + UI.roleTag(u.role) + '</td><td>' + (u.department||'-') + '</td><td>' + (u.phone||'-') + '</td><td>' + UI.statusTag(u.status) + '</td><td><button class="btn-text" onclick="Pages._editUser(\'' + u.id + '\')">编辑</button><button class="btn-text" onclick="Pages._resetPwd(\'' + u.id + '\')">重置密码</button><button class="btn-text danger" onclick="Pages._toggleUser(\'' + u.id + '\')">' + (u.status === 'active' ? '禁用' : '启用') + '</button>' + deleteBtn + '</td></tr>';

      }).join('') +

      '</tbody></table></div></div>';

    document.getElementById('btn-add-u').onclick = function() { Pages._editUser(null); };

  },



  _deleteUser: function(id) {

    var currentUser = Auth.getUser();

    var isAdmin = currentUser && currentUser.role === 'admin';

    if (!isAdmin) { UI.toast('只有管理员可以删除用户', 'error'); return; }

    var u = Store.getById('users', id);

    if (!u) return;

    if (id === currentUser.id) { UI.toast('不能删除当前登录的用户', 'error'); return; }

    UI.confirm('确定要删除用户 <strong>' + u.username + ' - ' + u.realName + '</strong> 吗？此操作不可恢复！', function() {

      // 直接从本地删除并入队（skipSync=false），联网后后台队列自动同步到服务器

      Store.remove('users', id);

      Store.addLog('删除用户', '删除用户 ' + u.username);

      UI.toast('用户删除成功（待同步）', 'success');

      Router.render();

    });

  },



  _editUser: function(id) {

    var user = id ? Store.getById('users', id) : null;

    UI.modal(user ? '编辑用户' : '新增用户',

      '<div class="form-row"><div class="form-group"><label>用户名 <span class="required">*</span></label><input type="text" id="fu-name" value="' + (user ? user.username : '') + '"' + (user ? ' readonly style="background:#f5f5f5"' : '') + '></div><div class="form-group"><label>姓名 <span class="required">*</span></label><input type="text" id="fu-real" value="' + (user ? user.realName : '') + '"></div></div>' +

      '<div class="form-row"><div class="form-group"><label>角色</label><select id="fu-role"><option value="admin"' + (user && user.role === 'admin' ? ' selected' : '') + '>管理员</option><option value="engineer"' + (user && user.role === 'engineer' ? ' selected' : '') + '>工程师</option><option value="production"' + (user && user.role === 'production' ? ' selected' : '') + '>生产管理</option><option value="guest"' + (user && user.role === 'guest' ? ' selected' : '') + '>访客</option></select></div><div class="form-group"><label>部门</label><input type="text" id="fu-dept" value="' + (user ? user.department||'' : '') + '"></div></div>' +

      '<div class="form-row"><div class="form-group"><label>联系电话</label><input type="text" id="fu-phone" value="' + (user ? user.phone||'' : '') + '"></div>' + (!user ? '<div class="form-group"><label>初始密码</label><input type="text" id="fu-pwd" value="123456"></div>' : '<div class="form-group"></div>') + '</div>',

      { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-su">保存</button>' });

    document.getElementById('btn-su').onclick = function() {

      var un = document.getElementById('fu-name').value.trim();

      var rn = document.getElementById('fu-real').value.trim();

      if (!un || !rn) { UI.toast('用户名和姓名为必填项', 'warning'); return; }

      var data = { username:un, realName:rn, role:document.getElementById('fu-role').value, department:document.getElementById('fu-dept').value.trim(), phone:document.getElementById('fu-phone').value.trim(), status:'active' };

      if (user) { Store.update('users', id, data); if (id === Auth.getUser().id) Auth.refreshUser(); Store.addLog('编辑用户', '编辑用户 ' + un); UI.toast('用户更新成功', 'success'); }

      else { data.password = document.getElementById('fu-pwd').value || '123456'; Store.add('users', data); Store.addLog('新增用户', '新增用户 ' + un); UI.toast('用户创建成功', 'success'); }

      UI.closeModal(); Router.render();

    };

  },



  _resetPwd: function(id) { UI.confirm('确定要将密码重置为 123456 吗？', function() { Store.update('users', id, { password:'123456' }); Store.addLog('重置密码', '重置用户ID ' + id + ' 的密码'); UI.toast('密码已重置', 'success'); }); },

  _toggleUser: function(id) {

    var u = Store.getById('users', id);

    if (!u) return;

    var ns = u.status === 'active' ? 'disabled' : 'active';

    Store.update('users', id, { status:ns });

    Store.addLog('切换用户状态', u.username + ' → ' + (ns === 'active' ? '启用' : '禁用'));

    UI.toast('用户已' + (ns === 'active' ? '启用' : '禁用'), 'success'); Router.render();

  },



  /* ===== Logs ===== */

  logs: function(c) {

    var logs = Store.getAll('logs').slice().reverse();

    c.innerHTML = '<div class="page-header"><h2>📝 操作日志</h2></div><div class="card"><div class="card-body"><div class="log-list" style="max-height:600px">' +

      (logs.length === 0 ? '<p style="color:var(--text-light);text-align:center;padding:40px">暂无日志记录</p>' :

        logs.map(function(l) { return '<div class="log-item"><span class="log-time">' + UI.formatDate(l.time) + '</span><span class="log-user">' + l.user + '</span><span class="log-action">' + l.action + (l.detail ? ' — ' + l.detail : '') + '</span></div>'; }).join('')) +

      '</div></div></div>';

  },



  /* ===== Settings ===== */

  settings: function(c) {

    var dicts = { '材质字典':'dict_materials' };

    var dictTypeMap = { 'dict_materials': 'materials' };

    function render() {

      c.innerHTML = '<div class="page-header"><h2>⚙️ 系统设置</h2></div><div class="card"><div class="card-header">字典管理</div><div class="card-body">' +

        Object.keys(dicts).map(function(label) {

          var key = dicts[label]; var items = Store.getAll(key);

          return '<div class="dict-table"><h4 style="margin-bottom:8px">' + label + ' <span style="font-size:12px;color:var(--text-light)">(' + items.length + '项)</span></h4>' +

            items.map(function(item, i) {

              var displayValue = typeof item === 'object' ? item.value : item;

              var itemId = typeof item === 'object' ? item.id : i;

              return '<div class="dict-item"><span class="dict-value">' + displayValue + '</span><div class="dict-actions"><button class="btn-text btn-sm de" data-k="' + key + '" data-i="' + i + '" data-id="' + itemId + '">编辑</button><button class="btn-text danger btn-sm dd" data-k="' + key + '" data-i="' + i + '" data-id="' + itemId + '">删除</button></div></div>';

            }).join('') +

            '<button class="btn-outline btn-sm da" data-k="' + key + '" style="margin-top:8px">＋ 添加</button></div>';

        }).join('<hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0">') +

      '</div></div><div class="card" style="margin-top:16px"><div class="card-header">数据管理</div><div class="card-body" style="display:flex;gap:12px"><button class="btn-outline" onclick="Pages._exportAll()">📦 导出全部数据</button><button class="btn-danger" onclick="Pages._clearAll()">🗑️ 重置系统数据</button></div></div>';



      document.querySelectorAll('.da').forEach(function(b) { b.onclick = function() {

        var key = b.dataset.k;

        UI.modal('添加字典项', '<div class="form-group"><label>名称</label><input type="text" id="fdv"></div>', { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-da">添加</button>' });

        document.getElementById('btn-da').onclick = async function() {

          var v = document.getElementById('fdv').value.trim();

          if (!v) { UI.toast('请输入名称', 'warning'); return; }

          var d = Store.getAll(key);

          var exists = d.some(function(item) { return (typeof item === 'object' ? item.value : item) === v; });

          if (exists) { UI.toast('该项已存在', 'warning'); return; }

          // 调用后端API创建

          try {

            var dictType = dictTypeMap[key];

            var created = await API.createDict(dictType, v);

            Store.add(key, created, { skipSync: true });

            Store.addLog('字典管理', '添加: ' + v);

            UI.toast('添加成功', 'success');

            UI.closeModal();

            render();

          } catch (e) {

            UI.toast('添加失败: ' + (e.message || '未知错误'), 'error');

          }

        };

      }; });

      document.querySelectorAll('.de').forEach(function(b) { b.onclick = function() {

        var key = b.dataset.k; var idx = parseInt(b.dataset.i); var itemId = b.dataset.id;

        var d = Store.getAll(key); var item = d[idx];

        var oldValue = typeof item === 'object' ? item.value : item;

        UI.modal('编辑字典项', '<div class="form-group"><label>名称</label><input type="text" id="fdv" value="' + oldValue + '"></div>', { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-de">保存</button>' });

        document.getElementById('btn-de').onclick = async function() {

          var v = document.getElementById('fdv').value.trim();

          if (!v) { UI.toast('名称不能为空', 'warning'); return; }

          // 调用后端API更新

          try {

            var dictType = dictTypeMap[key];

            var updated = await API.updateDict(dictType, itemId, v);

            Store.update(key, itemId, updated, { skipSync: true });

            Store.addLog('字典管理', '编辑: ' + oldValue + ' → ' + v);

            UI.toast('修改成功', 'success');

            UI.closeModal();

            render();

          } catch (e) {

            UI.toast('修改失败: ' + (e.message || '未知错误'), 'error');

          }

        };

      }; });

      document.querySelectorAll('.dd').forEach(function(b) { b.onclick = function() {

        var key = b.dataset.k; var idx = parseInt(b.dataset.i); var itemId = b.dataset.id;

        var d = Store.getAll(key); var item = d[idx];

        var v = typeof item === 'object' ? item.value : item;

        UI.confirm('确定要删除 <strong>' + v + '</strong> 吗？', async function() {

          try {

            var dictType = dictTypeMap[key];

            await API.deleteDict(dictType, itemId).catch(function(r) {

              // 后端不存在该项（404）时视为删除成功

              if (r && r.status === 404) return null;

              throw r;

            });

            // 删除本地数据：优先按 itemId 删除，若找不到则按数组索引删除

            var d = Store.getAll(key);

            var removed = false;

            if (d.find(function(x) { return x && x.id === itemId; })) {

              Store.remove(key, itemId); removed = true;

            } else {

              d.splice(idx, 1); Store.saveAll(key, d); removed = true;

            }

            Store.addLog('字典管理', '删除: ' + v);

            UI.toast('删除成功', 'success');

            render();

          } catch (e) {

            UI.toast('删除失败: ' + (e.message || '未知错误'), 'error');

          }

        });

      }; });

    }

    render();

  },



  _exportAll: function() {

    var all = {};

    ['parts','components','bom','users'].forEach(function(k) { all[k] = Store.getAll(k); });

    var json = JSON.stringify(all, null, 2);

    var blob = new Blob([json], { type: 'application/json' });

    var a = document.createElement('a');

    a.href = URL.createObjectURL(blob);

    a.download = 'BOM_备份_' + new Date().toISOString().slice(0,10) + '.json';

    a.click();

    Store.addLog('数据备份', '导出全部数据'); UI.toast('数据已导出', 'success');

  },



  _clearAll: function() {

    UI.confirm('⚠️ 此操作将清空所有数据并重置系统，确定继续吗？', function() {

      Object.keys(localStorage).filter(function(k) { return k.indexOf('bom_') === 0; }).forEach(function(k) { localStorage.removeItem(k); });

      Store.init(); Store.addLog('系统重置', '数据已清空并重置'); UI.toast('系统已重置', 'success'); Router.render();

    });

  }

};

