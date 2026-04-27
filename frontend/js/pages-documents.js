var Documents = {
  render: function(c) {
    // UI: 与 Parts 页风格对齐
    c.innerHTML = '<div class="page-header"><h2>📄 图文档管理</h2><div class="actions"><button class="btn-primary" id="btn-create-doc">+ 新建图文文档</button></div></div>' +
      '<div class="card"><div class="toolbar">' +
        '<div class="search-box" style="flex:1"><input type="text" id="doc-search" class="form-input" placeholder="搜索编号或名称..." style="width:100%"></div>' +
        '<select id="doc-status-filter" class="form-select" style="width:160px">' +
          '<option value="">全部状态</option>' +
          '<option value="draft">草稿</option>' +
          '<option value="frozen">冻结</option>' +
          '<option value="released">发布</option>' +
          '<option value="obsolete">作废</option>' +
        '</select>' +
      '</div><div class="table-wrapper" id="docs-table-area"></div></div>';

    var docs = [];

    var cached = Store.getAll('documents');
    if (cached && cached.length > 0) {
      docs = cached;
      renderList();
    }

    API._fetch('GET', '/documents/').then(function(data) {
      docs = data || [];
      Store.saveAll('documents', docs);
      renderList();
    });

    function renderList(list) {
      if (!list && list !== false) list = docs;
      var container = document.getElementById('docs-table-area');
      if (!container) return;
      var kw = (document.getElementById('doc-search').value || '').trim().toLowerCase();
      var statusF = document.getElementById('doc-status-filter').value;
      var filtered = list.filter(function(d) {
        if (statusF && d.status !== statusF) return false;
        if (kw) {
          var code = (d.code || '').toLowerCase();
          var name = (d.name || '').toLowerCase();
          if (code.indexOf(kw) === -1 && name.indexOf(kw) === -1) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-light)">暂无图文档</div>';
        return;
      }

      var html = '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#fafafa;border-bottom:2px solid #e8e8e8">' +
        '<th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;width:100px">编号</th>' +
        '<th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600">名称</th>' +
        '<th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600;width:60px">版本</th>' +
        '<th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600;width:70px">状态</th>' +
        '<th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;width:150px">主附件</th>' +
        '<th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600;width:100px">操作</th>' +
        '</tr></thead><tbody>';

      filtered.forEach(function(d) {
        html += '<tr style="border-bottom:1px solid #f0f0f0;cursor:pointer" data-id="' + d.id + '">' +
          '<td style="padding:10px 12px;font-weight:500">' + _esc(d.code) + '</td>' +
          '<td style="padding:10px 12px">' + _esc(d.name) + '</td>' +
          '<td style="padding:10px 12px;text-align:center"><span class="tag" style="background:#e6f7ff;color:#1890ff">' + _esc(d.version) + '</span></td>' +
          '<td style="padding:10px 12px;text-align:center">' + UI.statusTag(d.status || 'draft') + '</td>' +
          '<td style="padding:10px 12px;font-size:13px;color:#666">' + (d.file_name ? _esc(d.file_name) : '<span style="color:#ccc">—</span>') + '</td>' +
          '<td style="padding:10px 12px;text-align:center">' +
            '<button class="btn-text btn-sm btn-edit-doc" data-id="' + d.id + '">编辑</button>' +
            '<button class="btn-text btn-sm btn-delete-doc" data-id="' + d.id + '">删除</button>' +
          '</td></tr>';
      });

      html += '</tbody></table>';
      container.innerHTML = html;

      container.querySelectorAll('tr[data-id]').forEach(function(tr) {
        tr.onclick = function() { Documents._viewDoc(tr.dataset.id, docs); };
      });

      container.querySelectorAll('.btn-edit-doc').forEach(function(btn) {
        btn.onclick = function(e) { e.stopPropagation(); Documents._editDoc(btn.dataset.id); };
      });
      container.querySelectorAll('.btn-delete-doc').forEach(function(btn) {
        btn.onclick = function(e) { e.stopPropagation(); Documents._deleteDoc(btn.dataset.id); };
      });
    }

    document.getElementById('btn-create-doc').onclick = function() { Documents._editDoc(null); };
    document.getElementById('doc-search').oninput = function() { renderList(); };
    document.getElementById('doc-status-filter').onchange = function() { renderList(); };
  },

  _viewDoc: function(id, docs) {
    var doc = docs.find(function(d) { return d.id === id; });
    if (!doc) return;

    var html = '<div class="form-row"><div class="form-group"><label>编号</label><div style="padding:6px 0;font-weight:500">' + _esc(doc.code) + '</div></div><div class="form-group"><label>名称</label><div style="padding:6px 0">' + _esc(doc.name) + '</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label>版本</label><div style="padding:6px 0">' + _esc(doc.version) + '</div></div><div class="form-group"><label>状态</label><div style="padding:6px 0">' + UI.statusTag(doc.status || 'draft') + '</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label>描述</label><div style="padding:6px 0">' + (doc.description ? _esc(doc.description) : '<span style="color:#ccc">—</span>') + '</div></div><div class="form-group"><label>主附件</label><div style="padding:6px 0">' + (doc.file_name ? _esc(doc.file_name) : '<span style="color:#ccc">未上传</span>') + '</div></div></div>';

    UI.modal('图文档详情 — ' + doc.code, html, {
      footer: '<button class="btn-outline" onclick="UI.closeModal()">关闭</button>' +
        '<button class="btn-primary" onclick="UI.closeModal();Documents._editDoc(\'' + doc.id + '\')">编辑</button>'
    });
  },

  _editDoc: function(id) {
    var isNew = !id;
    var doc = isNew ? null : (Store.getById('documents', id) || null);

    if (id && !doc) {
      API._fetch('GET', '/documents/' + id).then(function(d) {
        doc = d;
        _renderForm(d);
      }).catch(function() { UI.toast('图文档不存在', 'error'); });
      return;
    }

    _loadDocCFDefs().then(function(cfDefs) {
      _renderForm(doc, cfDefs);
    });

    function _renderForm(doc, cfDefs) {
      cfDefs = cfDefs || [];
      var cfValues = doc ? (doc.customFields || {}) : {};
      var cfHtml = _renderCFEditHtmlDoc(cfValues, cfDefs);

      UI.modal(isNew ? '新建图文文档' : '编辑图文文档',
        // form body
        '<div class="form-group"><label>编号 <span class="required">*</span></label><input type="text" id="doc-code" value="' + (doc ? _esc(doc.code) : '') + '" placeholder="如：DOC-00001"' + (doc ? ' readonly' : '') + '></div>' +
        '<div class="form-row"><div class="form-group"><label>名称 <span class="required">*</span></label><input type="text" id="doc-name" value="' + (doc ? _esc(doc.name) : '') + '" placeholder="如：传动轴图纸"></div>' +
        '<div class="form-group"><label>版本</label><input type="text" id="doc-version" value="' + (doc ? _esc(doc.version) : 'A') + '" placeholder="A"></div></div>' +
        '<div class="form-group"><label>状态</label><select id="doc-status"><option value="draft" ' + (doc && doc.status === 'draft' ? 'selected' : '') + '>草稿</option><option value="frozen"' + (doc && doc.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (doc && doc.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (doc && doc.status === 'obsolete' ? ' selected' : '') + '>作废</option></select></div>' +
        '<div class="form-group"><label>描述</label><textarea id="doc-description" rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px">' + (doc ? _esc(doc.description || '') : '') + '</textarea></div>' +
        '<div id="doc-cf-edit-area">' + cfHtml + '</div>' +
        '<div id="doc-att-area"></div>',
        { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-save-doc">保存</button>' +
          (!isNew ? '<button class="btn-outline" style="margin-left:8px" id="btn-upload-doc-att">上传/替换附件</button>' : ''),
          afterRender: function() {
            if (!isNew) Documents._loadDocAttArea(doc.id, doc);

            document.getElementById('btn-save-doc').onclick = async function() {
              var code = document.getElementById('doc-code').value.trim();
              var name = document.getElementById('doc-name').value.trim();
              var version = document.getElementById('doc-version').value.trim();
              var status = document.getElementById('doc-status').value;
              var desc = document.getElementById('doc-description').value.trim();
              if (!code || !name) { UI.toast('编号和名称为必填', 'warning'); return; }

              var data = { name: name, version: version, status: status, description: desc || null };
              try {
                var result;
                if (isNew) {
                  data.id = _uuid();
                  data.code = code;
                  result = await API._fetch('POST', '/documents/', data);
                  UI.toast('图文档创建成功', 'success');
                } else {
                  result = await API._fetch('PUT', '/documents/' + id, data);
                  UI.toast('图文档更新成功', 'success');
                }
                // 保存自定义字段
                var cfVals = _collectCFValuesDoc(cfDefs);
                var cfDefsForSave = cfDefs;
                if (Object.keys(cfVals).length > 0 && result.id) {
                  _saveCFValues('document', result.id, cfVals, cfDefsForSave);
                }
                var all = Store.getAll('documents') || [];
                if (isNew) all.push(result); else { var idx = all.findIndex(function(d) { return d.id === id; }); if (idx >= 0) all[idx] = result; }
                Store.saveAll('documents', all);
                UI.closeModal();
                Documents.render(document.getElementById('content'));
              } catch (e) { UI.toast('操作失败: ' + (e.message || '未知错误'), 'error'); }
            };

            if (!isNew && document.getElementById('btn-upload-doc-att')) {
              document.getElementById('btn-upload-doc-att').onclick = function() {
                var input = document.createElement('input');
                input.type = 'file';
                input.onchange = function() {
                  var f = input.files[0];
                  if (!f) return;
                  UI._fileToBase64(f, function(b64) {
                    UI.toast('正在上传...', 'info');
                    var attData = { id: _uuid(), file_name: f.name, file_data: b64.indexOf(',') > 0 ? b64.split(',')[1] : b64 };
                    API._fetch('POST', '/documents/' + id + '/attachments', attData).then(function(r) {
                      UI.toast('附件上传成功', 'success');
                      var all = Store.getAll('documents') || [];
                      var docObj = all.find(function(d) { return d.id === id; });
                      if (docObj) { docObj.file_name = r.file_name; docObj.file_id = r.id; Store.saveAll('documents', all); }
                      Documents._loadDocAttArea(id, docObj);
                    }).catch(function(e) { UI.toast('上传失败: ' + e.message, 'error'); });
                  });
                };
                input.click();
              };
            }
          }
        });
    }
  },
  
  _loadDocAttArea: function(docId, doc) {
    var area = document.getElementById('doc-att-area');
    if (!area) return;
    area.innerHTML = '<h4 style="margin:16px 0 12px;border-top:1px solid #f0f0f0;padding-top:16px">📎 主附件</h4>' +
      '<div style="display:flex;align-items:center;margin-bottom:8px;font-size:13px">' +
        '<span style="flex:1">' + (doc && doc.file_name ? _esc(doc.file_name) : '<span style="color:#999">未上传</span>') + '</span>' +
        (doc && doc.file_id ? '<button class="btn-link" id="btn-download-doc-att">下载</button><button class="btn-link" style="color:#ff4d4f;margin-left:8px" id="btn-delete-doc-att">删除</button>' : '') +
      '</div>';

    var dlBtn = document.getElementById('btn-download-doc-att');
    if (dlBtn) dlBtn.onclick = function() {
      API._fetch('GET', '/documents/' + docId + '/attachments/' + doc.file_id).then(function(a) {
        if (a && a.file_data) UI._downloadBase64(a.file_data, a.file_name);
        else UI.toast('附件数据为空', 'warning');
      }).catch(function(e) { UI.toast('下载失败: ' + e.message, 'error'); });
    };

    var delBtn = document.getElementById('btn-delete-doc-att');
    if (delBtn) delBtn.onclick = function() {
      if (!confirm('确定要删除此附件吗？')) return;
      API._fetch('DELETE', '/documents/' + docId + '/attachments/' + doc.file_id).then(function() {
        UI.toast('附件已删除', 'success');
        var all = Store.getAll('documents') || [];
        var docObj = all.find(function(d) { return d.id === docId; });
        if (docObj) { docObj.file_name = null; docObj.file_id = null; Store.saveAll('documents', all); }
        Documents._loadDocAttArea(docId, null);
      }).catch(function(e) { UI.toast('删除失败: ' + e.message, 'error'); });
    };
  },
  
  _viewDoc: function(id, docs) {
    var doc = docs.find(function(d) { return d.id === id; });
    if (!doc) return;
    var html = '<div class="form-row"><div class="form-group"><label>编号</label><div style="padding:6px 0;font-weight:500">' + _esc(doc.code) + '</div></div><div class="form-group"><label>状态</label><div style="padding:6px 0">' + UI.statusTag(doc.status || 'draft') + '</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label>名称</label><div style="padding:6px 0">' + _esc(doc.name) + '</div></div>' +
        '<div class="form-group"><label>版本</label><div style="padding:6px 0">' + _esc(doc.version) + '</div></div></div>' +
      '<div class="form-group"><label>描述</label><div style="padding:6px 0">' + (doc.description ? _esc(doc.description) : '<span style="color:#ccc">—</span>') + '</div></div>' +
      '<div class="form-group"><label>主附件</label><div style="padding:6px 0">' + (doc.file_name ? _esc(doc.file_name) : '<span style="color:#ccc">未上传</span>') + '</div></div>';
    UI.modal('图文档详情 — ' + doc.code, html, {
      footer: '<button class="btn-outline" onclick="UI.closeModal()">关闭</button>' +
        '<button class="btn-primary" onclick="UI.closeModal();Documents._editDoc(\'' + doc.id + '\')">编辑</button>'
    });
  },
  
  _editDoc: function(id) {
    var isNew = !id;
    var doc = isNew ? null : (Store.getById('documents', id) || null);
    if (id && !doc) {
      API._fetch('GET', '/documents/' + id).then(function(d) {
        doc = d;
        _renderForm(d);
      }).catch(function() { UI.toast('图文档不存在', 'error'); });
      return;
    }
    _loadDocCFDefs().then(function(cfDefs) {
      _renderForm(doc, cfDefs);
    });
    function _renderForm(doc, cfDefs) {
      cfDefs = cfDefs || [];
      var cfValues = doc ? (doc.customFields || {}) : {};
      var cfHtml = _renderCFEditHtmlDoc(cfValues, cfDefs);
    UI.modal(isNew ? '新建图文文档' : '编辑图文文档',
        '<div class="form-row"><div class="form-group"><label>编号 <span class="required">*</span></label><input type="text" id="doc-code" value="' + (doc ? _esc(doc.code) : '') + '" placeholder="如：DOC-00001"' + (doc ? ' readonly' : '') + '></div>' +
        '<div class="form-group"><label>名称 <span class="required">*</span></label><input type="text" id="doc-name" value="' + (doc ? _esc(doc.name) : '') + '" placeholder="如：传动轴图纸"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>版本</label><input type="text" id="doc-version" value="' + (doc ? _esc(doc.version) : 'A') + '" placeholder="A"></div>' +
        '<div class="form-group"><label>状态</label><select id="doc-status"><option value="draft" ' + (doc && doc.status === 'draft' ? 'selected' : '') + '>草稿</option><option value="frozen"' + (doc && doc.status === 'frozen' ? ' selected' : '') + '>冻结</option><option value="released"' + (doc && doc.status === 'released' ? ' selected' : '') + '>发布</option><option value="obsolete"' + (doc && doc.status === 'obsolete' ? ' selected' : '') + '>作废</option></select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>描述</label><textarea id="doc-description" rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px">' + (doc ? _esc(doc.description || '') : '') + '</textarea></div></div>' +
        '<div id="doc-cf-edit-area">' + cfHtml + '</div>' +
        '<div id="doc-att-area"></div>',
        { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-save-doc">保存</button>' +
          (!isNew ? '<button class="btn-outline" style="margin-left:8px" id="btn-upload-doc-att">上传/替换附件</button>' : ''),
          afterRender: function() {
            if (!isNew) Documents._loadDocAttArea(doc.id, doc);
            document.getElementById('btn-save-doc').onclick = async function() {
              var code = document.getElementById('doc-code').value.trim();
              var name = document.getElementById('doc-name').value.trim();
              var version = document.getElementById('doc-version').value.trim();
              var status = document.getElementById('doc-status').value;
              var desc = document.getElementById('doc-description').value.trim();
              if (!code || !name) { UI.toast('编号和名称为必填', 'warning'); return; }
              var data = { name: name, version: version, status: status, description: desc || null };
              try {
                var result;
                if (isNew) {
                  data.id = _uuid();
                  data.code = code;
                  result = await API._fetch('POST', '/documents/', data);
                  UI.toast('图文档创建成功', 'success');
                } else {
                  result = await API._fetch('PUT', '/documents/' + id, data);
                  UI.toast('图文档更新成功', 'success');
                }
                var cfVals = _collectCFValuesDoc(cfDefs);
                var cfDefsForSave = cfDefs;
                if (Object.keys(cfVals).length > 0 && result.id) {
                  _saveCFValues('document', result.id, cfVals, cfDefsForSave);
                }
                var all = Store.getAll('documents') || [];
                if (isNew) all.push(result); else { var idx = all.findIndex(function(d) { return d.id === id; }); if (idx >= 0) all[idx] = result; }
                Store.saveAll('documents', all);
                UI.closeModal();
                Documents.render(document.getElementById('content'));
              } catch (e) { UI.toast('操作失败: ' + (e.message || '未知错误'), 'error'); }
            };
            if (!isNew && document.getElementById('btn-upload-doc-att')) {
              document.getElementById('btn-upload-doc-att').onclick = function() {
                var input = document.createElement('input');
                input.type = 'file';
                input.onchange = function() {
                  var f = input.files[0];
                  if (!f) return;
                  UI._fileToBase64(f, function(b64) {
                    UI.toast('正在上传...', 'info');
                    var attData = { id: _uuid(), file_name: f.name, file_data: b64.indexOf(',') > 0 ? b64.split(',')[1] : b64 };
                    API._fetch('POST', '/documents/' + id + '/attachments', attData).then(function(r) {
                      UI.toast('附件上传成功', 'success');
                      var all = Store.getAll('documents') || [];
                      var docObj = all.find(function(d) { return d.id === id; });
                      if (docObj) { docObj.file_name = r.file_name; docObj.file_id = r.id; Store.saveAll('documents', all); }
                      Documents._loadDocAttArea(id, docObj);
                    }).catch(function(e) { UI.toast('上传失败: ' + e.message, 'error'); });
                  });
                };
                input.click();
              };
            }
          }
        });
    }
  },
  
  _loadDocAttArea: function(docId, doc) {
    var area = document.getElementById('doc-att-area');
    if (!area) return;
    area.innerHTML = '<h4 style="margin:16px 0 12px;border-top:1px solid #f0f0f0;padding-top:16px">📎 主附件</h4>' +
      '<div style="display:flex;align-items:center;margin-bottom:8px;font-size:13px">' +
        '<span style="flex:1">' + (doc && doc.file_name ? _esc(doc.file_name) : '<span style="color:#999">未上传</span>') + '</span>' +
        (doc && doc.file_id ? '<button class="btn-link" id="btn-download-doc-att">下载</button><button class="btn-link" style="color:#ff4d4f;margin-left:8px" id="btn-delete-doc-att">删除</button>' : '') +
      '</div>';
    var dlBtn = document.getElementById('btn-download-doc-att');
    if (dlBtn) dlBtn.onclick = function() {
      API._fetch('GET', '/documents/' + docId + '/attachments/' + doc.file_id).then(function(a) {
        if (a && a.file_data) UI._downloadBase64(a.file_data, a.file_name);
        else UI.toast('附件数据为空', 'warning');
      }).catch(function(e) { UI.toast('下载失败: ' + e.message, 'error'); });
    };
    var delBtn = document.getElementById('btn-delete-doc-att');
    if (delBtn) delBtn.onclick = function() {
      if (!confirm('确定要删除此附件吗？')) return;
      API._fetch('DELETE', '/documents/' + docId + '/attachments/' + doc.file_id).then(function() {
        UI.toast('附件已删除', 'success');
        var all = Store.getAll('documents') || [];
        var docObj = all.find(function(d) { return d.id === docId; });
        if (docObj) { docObj.file_name = null; docObj.file_id = null; Store.saveAll('documents', all); }
        Documents._loadDocAttArea(docId, null);
      }).catch(function(e) { UI.toast('删除失败: ' + e.message, 'error'); });
    };
  },
  
  _deleteDoc: function(id) {
    var localDocs = Store.getAll('documents') || [];
    var doc = localDocs.find(function(d) { return d.id === id; });
    if (!doc) return;
    UI.confirm('确定要删除图文档 <strong>' + _esc(doc.code) + ' — ' + _esc(doc.name) + '</strong> 吗？', async function() {
      try {
        await API._fetch('DELETE', '/documents/' + id);
        var all = (Store.getAll('documents') || []).filter(function(d) { return d.id !== id; });
        Store.saveAll('documents', all);
        UI.toast('图文档已删除', 'success');
        Documents.render(document.getElementById('content'));
      } catch (e) { UI.toast('删除失败: ' + (e.message || '未知错误'), 'error'); }
    });
  }
};

// ===== 图文档自定义字段工具函数 =====

function _loadDocCFDefs() {
  return API.getCustomFieldDefinitions('document').then(function(defs) {
    return defs || [];
  }).catch(function() { return []; });
}

function _renderCFEditHtmlDoc(cfValues, cfDefs) {
  if (!cfDefs || cfDefs.length === 0) return '';
  var html = '<h4 style="margin:16px 0 12px;border-top:1px solid #f0f0f0;padding-top:16px">🏷️ 自定义属性</h4><div class="form-row" style="flex-wrap:wrap">';
  cfDefs.forEach(function(d) {
    var val = cfValues ? cfValues[d.field_key] : '';
    var reqMark = d.is_required ? ' <span class="required">*</span>' : '';
    html += '<div class="form-group" style="min-width:200px;flex:1"><label>' + _esc(d.name) + reqMark + '</label>';
    if (d.field_type === 'text') {
      html += '<input type="text" id="doc-cf-' + d.field_key + '" value="' + _esc(String(val || '')) + '">';
    } else if (d.field_type === 'number') {
      html += '<input type="number" id="doc-cf-' + d.field_key + '" value="' + _esc(String(val || '')) + '">';
    } else if (d.field_type === 'select') {
      html += '<select id="doc-cf-' + d.field_key + '"><option value="">— 请选择 —</option>';
      (d.options || []).forEach(function(opt) {
        html += '<option value="' + _esc(opt) + '"' + (val === opt ? ' selected' : '') + '>' + _esc(opt) + '</option>';
      });
      html += '</select>';
    } else if (d.field_type === 'multiselect') {
      var selectedVals = Array.isArray(val) ? val : [];
      html += '<div id="doc-' + d.field_key + '" style="display:flex;flex-wrap:wrap;gap:6px">';
      (d.options || []).forEach(function(opt) {
        var checked = selectedVals.indexOf(opt) >= 0 ? ' checked' : '';
        html += '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="checkbox" name="doc-' + d.field_key + '" value="' + _esc(opt) + '"' + checked + '>' + _esc(opt) + '</label>';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function _collectCFValuesDoc(cfDefs) {
  if (!cfDefs || cfDefs.length === 0) return {};
  var values = {};
  cfDefs.forEach(function(d) {
    var el = document.getElementById('doc-cf-' + d.field_key);
    if (!el) return;
    if (d.field_type === 'multiselect') {
      var checks = document.querySelectorAll('input[name="doc-cf-' + d.field_key + '"]:checked');
      values[d.field_key] = Array.from(checks).map(function(c) { return c.value; });
    } else if (d.field_type === 'number') {
      var numVal = el.value.trim();
      values[d.field_key] = numVal ? parseFloat(numVal) : null;
    } else {
      values[d.field_key] = el.value.trim() || null;
    }
  });
  return values;
}

function _saveCFValues(entityType, entityId, cfValues, cfDefs) {
  if (!cfDefs || cfDefs.length === 0 || !cfValues) return Promise.resolve();
  var values = [];
  cfDefs.forEach(function(d) {
    if (cfValues.hasOwnProperty(d.field_key)) {
      values.push({ field_id: d.id, value: cfValues[d.field_key] });
    }
  });
  if (values.length === 0) return Promise.resolve();
  console.log('[DEBUG] _saveCFValues:', entityType, 'ID:', entityId);
  return API.setCustomFieldValues(entityType, entityId, values).catch(function(e) {
    console.warn('自定义字段值保存失败:', e);
  });
}
