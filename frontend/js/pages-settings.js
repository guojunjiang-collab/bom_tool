var Settings = {

  // 系统设置页面
  render: function(c) {

    // 自定义字段定义缓存
    var cfDefs = [];

    function render() {
      c.innerHTML = '<div class="page-header"><h2>⚙️ 系统设置</h2></div>' +

      // ===== 自定义字段管理卡片 =====
      '<div class="card"><div class="card-header">自定义字段管理</div><div class="card-body" id="cf-card-body">' +
      '<div style="text-align:center;padding:20px;color:var(--text-light)">加载中...</div>' +
      '</div></div>' +

      '<div class="card" style="margin-top:16px"><div class="card-header">数据管理</div><div class="card-body" style="display:flex;gap:12px"><button class="btn-outline" onclick="Settings._exportAll()">📦 导出全部数据</button><button class="btn-danger" onclick="Settings._clearAll()">🗑️ 重置系统数据</button></div></div>';

      // 加载自定义字段定义
      loadCustomFields();
    }

    function loadCustomFields() {
      API.getCustomFieldDefinitions().then(function(defs) {
        cfDefs = defs || [];
        renderCustomFields();
      }).catch(function() {
        // 离线模式：从本地缓存读取
        cfDefs = Store.getAll('custom_field_defs');
        renderCustomFields();
      });
    }

    function renderCustomFields() {
      var body = document.getElementById('cf-card-body');
      if (!body) return;

      var typeLabels = { text: '文本', number: '数字', select: '单选', multiselect: '多选' };
      var appliesLabels = { part: '零件', component: '部件', both: '零件+部件' };

      var html = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-size:13px;color:var(--text-secondary)">已定义 ' + cfDefs.length + ' 个自定义字段</span>' +
        '<button class="btn-primary btn-sm" id="btn-add-cf">＋ 新增字段</button></div>';

      if (cfDefs.length === 0) {
        html += '<div style="padding:30px;text-align:center;color:var(--text-light);background:#fafafa;border-radius:6px">' +
          '<div style="font-size:24px;margin-bottom:8px">📝</div>' +
          '<div>暂无自定义字段，点击"新增字段"添加</div></div>';
      } else {
        html += '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#fafafa">' +
          '<th style="padding:8px 10px;text-align:left;font-size:12px;color:#888">名称</th>' +
          '<th style="padding:8px 10px;text-align:left;font-size:12px;color:#888">标识</th>' +
          '<th style="padding:8px 10px;text-align:left;font-size:12px;color:#888">类型</th>' +
          '<th style="padding:8px 10px;text-align:left;font-size:12px;color:#888">适用对象</th>' +
          '<th style="padding:8px 10px;text-align:center;font-size:12px;color:#888">必填</th>' +
          '<th style="padding:8px 10px;text-align:left;font-size:12px;color:#888">选项</th>' +
          '<th style="padding:8px 10px;text-align:center;font-size:12px;color:#888">操作</th>' +
          '</tr></thead><tbody>';

        cfDefs.forEach(function(cf, i) {
          var optsHtml = '';
          if ((cf.field_type === 'select' || cf.field_type === 'multiselect') && cf.options && cf.options.length > 0) {
            optsHtml = cf.options.slice(0, 3).map(function(o) { return '<span class="tag" style="background:#f0f0f0;color:#666;font-size:11px;margin:1px">' + _esc(o) + '</span>'; }).join('') +
              (cf.options.length > 3 ? '<span style="font-size:11px;color:#999">+' + (cf.options.length - 3) + '</span>' : '');
          } else {
            optsHtml = '<span style="color:#ccc">—</span>';
          }

          html += '<tr style="border-bottom:1px solid #f0f0f0">' +
            '<td style="padding:8px 10px;font-weight:500">' + _esc(cf.name) + '</td>' +
            '<td style="padding:8px 10px"><code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:12px">' + _esc(cf.field_key) + '</code></td>' +
            '<td style="padding:8px 10px"><span class="tag" style="background:#e6f7ff;color:#1890ff">' + (typeLabels[cf.field_type] || cf.field_type) + '</span></td>' +
            '<td style="padding:8px 10px;font-size:13px">' + (appliesLabels[cf.applies_to] || cf.applies_to) + '</td>' +
            '<td style="padding:8px 10px;text-align:center">' + (cf.is_required ? '<span style="color:#ff4d4f">✓</span>' : '<span style="color:#ccc">—</span>') + '</td>' +
            '<td style="padding:8px 10px">' + optsHtml + '</td>' +
            '<td style="padding:8px 10px;text-align:center">' +
              '<button class="btn-text btn-sm" onclick="Settings._editCF(\'' + cf.id + '\')">编辑</button>' +
              '<button class="btn-text danger btn-sm" onclick="Settings._deleteCF(\'' + cf.id + '\')">删除</button>' +
            '</td></tr>';
        });

        html += '</tbody></table>';
      }

      body.innerHTML = html;

      var addBtn = document.getElementById('btn-add-cf');
      if (addBtn) addBtn.onclick = function() { Settings._editCF(null); };
    }

    render();
  },

  // ===== 自定义字段管理 =====

  _editCF: function(id) {
    var existing = id ? null : null;  // 从 cfDefs 中查找
    // 获取当前字段列表
    var allDefs = [];
    try { API.getCustomFieldDefinitions().then(function(d) { allDefs = d || []; }); } catch(e) {}
    allDefs = Store.getAll('custom_field_defs');  // fallback

    var cf = null;
    if (id) {
      // 从API或本地查找
      var localDefs = Store.getAll('custom_field_defs');
      cf = localDefs.find(function(d) { return d.id === id; });
    }

    var isNew = !cf;
    var typeOptions = { text: '文本', number: '数字', select: '单选', multiselect: '多选' };
    var appliesOptions = { part: '零件', component: '部件', both: '零件+部件' };

    var optionsHtml = '';
    if (cf && (cf.field_type === 'select' || cf.field_type === 'multiselect') && cf.options) {
      optionsHtml = cf.options.join('\n');
    }

    UI.modal(isNew ? '新增自定义字段' : '编辑自定义字段',
      '<div class="form-row"><div class="form-group"><label>字段名称 <span class="required">*</span></label><input type="text" id="cf-name" value="' + (cf ? _esc(cf.name) : '') + '" placeholder="如：供应商"></div>' +
      '<div class="form-group"><label>字段标识 <span class="required">*</span></label><input type="text" id="cf-key" value="' + (cf ? _esc(cf.field_key) : '') + '" placeholder="如：supplier" ' + (cf ? 'readonly' : '') + '><div style="font-size:11px;color:#999;margin-top:2px">英文标识，创建后不可修改</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label>字段类型</label><select id="cf-type">' +
        Object.keys(typeOptions).map(function(t) { return '<option value="' + t + '"' + (cf && cf.field_type === t ? ' selected' : '') + '>' + typeOptions[t] + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-group"><label>适用对象</label><select id="cf-applies">' +
        Object.keys(appliesOptions).map(function(a) { return '<option value="' + a + '"' + (cf && cf.applies_to === a ? ' selected' : (!cf && a === 'both' ? ' selected' : '')) + '>' + appliesOptions[a] + '</option>'; }).join('') +
      '</select></div></div>' +
      '<div class="form-row"><div class="form-group"><label><input type="checkbox" id="cf-required"' + (cf && cf.is_required ? ' checked' : '') + '> 是否必填</label></div></div>' +
      '<div class="form-group" id="cf-options-group" style="display:' + (cf && (cf.field_type === 'select' || cf.field_type === 'multiselect') ? 'block' : 'none') + '">' +
        '<label>选项列表 <span style="font-size:11px;color:#999">（每行一个选项）</span></label>' +
        '<textarea id="cf-options" rows="4" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px" placeholder="选项1&#10;选项2&#10;选项3">' + _esc(optionsHtml) + '</textarea>' +
      '</div>',
      { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-save-cf">保存</button>',
        afterRender: function() {
          // 字段类型变化时显示/隐藏选项区域
          document.getElementById('cf-type').onchange = function() {
            var t = this.value;
            document.getElementById('cf-options-group').style.display = (t === 'select' || t === 'multiselect') ? 'block' : 'none';
          };
          // 新建时自动生成 field_key
          if (isNew) {
            document.getElementById('cf-name').oninput = function() {
              var key = this.value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').replace(/_+/g, '_').toLowerCase();
              // 中文转拼音太复杂，简单用 cf_ 前缀 + 时间戳
              if (/[\u4e00-\u9fa5]/.test(key)) {
                key = 'cf_' + Date.now().toString(36);
              }
              document.getElementById('cf-key').value = key;
            };
          }
        }
      });

    document.getElementById('btn-save-cf').onclick = async function() {
      var name = document.getElementById('cf-name').value.trim();
      var fieldKey = document.getElementById('cf-key').value.trim();
      var fieldType = document.getElementById('cf-type').value;
      var appliesTo = document.getElementById('cf-applies').value;
      var isRequired = document.getElementById('cf-required').checked;

      if (!name || !fieldKey) { UI.toast('字段名称和标识为必填项', 'warning'); return; }
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldKey)) { UI.toast('字段标识必须以英文字母开头，只允许字母、数字和下划线', 'warning'); return; }

      var options = [];
      if (fieldType === 'select' || fieldType === 'multiselect') {
        var optText = document.getElementById('cf-options').value;
        options = optText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
        if (options.length === 0) { UI.toast('单选/多选类型至少需要一个选项', 'warning'); return; }
      }

      var data = {
        name: name,
        field_key: fieldKey,
        field_type: fieldType,
        options: options,
        is_required: isRequired,
        applies_to: appliesTo,
        sort_order: 0
      };

      try {
        var result;
        if (isNew) {
          result = await API.createCustomFieldDefinition(data);
          UI.toast('字段创建成功', 'success');
        } else {
          result = await API.updateCustomFieldDefinition(id, data);
          UI.toast('字段更新成功', 'success');
        }
        // 更新本地缓存
        var defs = Store.getAll('custom_field_defs');
        if (isNew) {
          defs.push(result);
        } else {
          var idx = defs.findIndex(function(d) { return d.id === id; });
          if (idx >= 0) defs[idx] = result;
        }
        Store.saveAll('custom_field_defs', defs);

        UI.closeModal();
        Settings.render(document.getElementById('content'));
      } catch (e) {
        UI.toast('操作失败: ' + (e.message || '未知错误'), 'error');
      }
    };
  },

  _deleteCF: function(id) {
    var localDefs = Store.getAll('custom_field_defs');
    var cf = localDefs.find(function(d) { return d.id === id; });
    if (!cf) return;

    UI.confirm('确定要删除自定义字段 <strong>' + _esc(cf.name) + '</strong> 吗？<br><span style="color:#ff4d4f;font-size:12px">该字段的所有数据将一并删除</span>', async function() {
      try {
        await API.deleteCustomFieldDefinition(id);
        // 更新本地缓存
        var defs = Store.getAll('custom_field_defs');
        Store.saveAll('custom_field_defs', defs.filter(function(d) { return d.id !== id; }));
        UI.toast('字段已删除', 'success');
        Settings.render(document.getElementById('content'));
      } catch (e) {
        UI.toast('删除失败: ' + (e.message || '未知错误'), 'error');
      }
    });
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
    UI.confirm('⚠️ 此操作将清除所有业务数据（零件、部件、BOM、附件、日志、自定义字段值），<strong>保留用户账号和系统设置</strong>（字典、自定义字段定义）。<br><br>本地与服务器的数据都将被清除，确定继续吗？', async function() {
      try {
        // 1. 调用后端API清除服务器数据
        await API.resetBusinessData();
        // 2. 清除本地业务数据缓存（保留登录状态和系统设置）
        var keepKeys = ['bom_api_token', 'bom_current_user', 'bom_custom_field_defs'];
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('bom_') === 0 && keepKeys.indexOf(k) < 0) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(function(k) { localStorage.removeItem(k); });
        // 3. 重置同步队列
        Store._syncQueue = [];
        Store._syncRunning = false;
        Store._syncStatus = 'idle';
        Store._needsRefresh = false;

        UI.toast('业务数据已重置，用户和系统设置已保留', 'success');
        Router.render();
      } catch (e) {
        UI.toast('重置失败: ' + (e.message || '未知错误'), 'error');
      }
    });
  }
};

// ===== 自定义字段工具函数（全局） =====

/**
 * 获取自定义字段定义列表（优先API，回退本地缓存）
 */
function _loadCFDefs() {
  return API.getCustomFieldDefinitions().then(function(defs) {
    Store.saveAll('custom_field_defs', defs || []);
    return defs || [];
  }).catch(function() {
    return Store.getAll('custom_field_defs');
  });
}

/**
 * 渲染自定义字段的只读展示 HTML
 * @param {object} cfValues - { field_key: value, ... } 格式的字段值
 * @param {array} cfDefs - 字段定义列表
 * @param {string} appliesTo - 'part' 或 'component'
 */
function _renderCFViewHtml(cfValues, cfDefs, appliesTo) {
  if (!cfDefs || cfDefs.length === 0) return '';
  var applicableDefs = cfDefs.filter(function(d) {
    return d.applies_to === appliesTo || d.applies_to === 'both';
  });
  if (applicableDefs.length === 0) return '';

  var html = '<h4 style="margin:20px 0 12px">🏷️ 自定义属性</h4><div class="form-row" style="flex-wrap:wrap">';
  applicableDefs.forEach(function(d) {
    var val = cfValues ? cfValues[d.field_key] : null;
    var displayVal = '';
    if (val !== undefined && val !== null && val !== '') {
      if (d.field_type === 'multiselect' && Array.isArray(val)) {
        displayVal = val.map(function(v) { return '<span class="tag" style="background:#e6f7ff;color:#1890ff;margin:1px">' + _esc(String(v)) + '</span>'; }).join(' ');
      } else if (d.field_type === 'select') {
        displayVal = '<span class="tag" style="background:#f6ffed;color:#52c41a">' + _esc(String(val)) + '</span>';
      } else if (d.field_type === 'number') {
        displayVal = '<span style="font-weight:600;color:#1890ff">' + _esc(String(val)) + '</span>';
      } else {
        displayVal = _esc(String(val));
      }
    } else {
      displayVal = '<span style="color:#ccc">—</span>';
    }
    html += '<div class="form-group" style="min-width:200px;flex:1"><label>' + _esc(d.name) + (d.is_required ? ' <span class="required">*</span>' : '') + '</label><div style="padding:6px 0">' + displayVal + '</div></div>';
  });
  html += '</div>';
  return html;
}

/**
 * 渲染自定义字段的编辑表单 HTML
 * @param {object} cfValues - 当前字段值
 * @param {array} cfDefs - 字段定义列表
 * @param {string} appliesTo - 'part' 或 'component'
 * @param {string} roAttr - readonly 属性（非草稿时）
 */
function _renderCFEditHtml(cfValues, cfDefs, appliesTo, roAttr) {
  if (!cfDefs || cfDefs.length === 0) return '';
  var applicableDefs = cfDefs.filter(function(d) {
    return d.applies_to === appliesTo || d.applies_to === 'both';
  });
  if (applicableDefs.length === 0) return '';

  var html = '<h4 style="margin:16px 0 12px;border-top:1px solid #f0f0f0;padding-top:16px">🏷️ 自定义属性</h4><div class="form-row" style="flex-wrap:wrap">';
  applicableDefs.forEach(function(d) {
    var val = cfValues ? cfValues[d.field_key] : '';
    var reqMark = d.is_required ? ' <span class="required">*</span>' : '';
    html += '<div class="form-group" style="min-width:200px;flex:1"><label>' + _esc(d.name) + reqMark + '</label>';

    if (d.field_type === 'text') {
      html += '<input type="text" id="cf-' + d.field_key + '" value="' + _esc(String(val || '')) + '"' + roAttr + '>';
    } else if (d.field_type === 'number') {
      html += '<input type="number" id="cf-' + d.field_key + '" value="' + _esc(String(val || '')) + '"' + roAttr + '>';
    } else if (d.field_type === 'select') {
      html += '<select id="cf-' + d.field_key + '"' + roAttr + '><option value="">— 请选择 —</option>';
      (d.options || []).forEach(function(opt) {
        html += '<option value="' + _esc(opt) + '"' + (val === opt ? ' selected' : '') + '>' + _esc(opt) + '</option>';
      });
      html += '</select>';
    } else if (d.field_type === 'multiselect') {
      var selectedVals = Array.isArray(val) ? val : [];
      html += '<div id="cf-' + d.field_key + '" style="display:flex;flex-wrap:wrap;gap:6px">';
      (d.options || []).forEach(function(opt) {
        var checked = selectedVals.indexOf(opt) >= 0 ? ' checked' : '';
        html += '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="checkbox" name="cf-' + d.field_key + '" value="' + _esc(opt) + '"' + checked + (roAttr ? ' disabled' : '') + '>' + _esc(opt) + '</label>';
      });
      html += '</div>';
    }

    html += '</div>';
  });
  html += '</div>';
  return html;
}

/**
 * 从编辑表单中收集自定义字段值
 * @param {array} cfDefs - 字段定义列表
 * @param {string} appliesTo - 'part' 或 'component'
 * @returns {object} { field_key: value, ... }
 */
function _collectCFValues(cfDefs, appliesTo) {
  if (!cfDefs || cfDefs.length === 0) return {};
  var applicableDefs = cfDefs.filter(function(d) {
    return d.applies_to === appliesTo || d.applies_to === 'both';
  });
  var values = {};
  applicableDefs.forEach(function(d) {
    var el = document.getElementById('cf-' + d.field_key);
    if (!el) return;

    if (d.field_type === 'multiselect') {
      var checks = document.querySelectorAll('input[name="cf-' + d.field_key + '"]:checked');
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

/**
 * 保存自定义字段值到服务器
 * @param {string} entityType - 'part' 或 'component'
 * @param {string} entityId - 实体ID
 * @param {object} cfValues - { field_key: value }
 * @param {array} cfDefs - 字段定义列表
 */
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
