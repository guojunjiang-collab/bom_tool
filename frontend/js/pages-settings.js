var Settings = {

  // 系统设置页面
  render: function(c) {
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
      '</div></div><div class="card" style="margin-top:16px"><div class="card-header">数据管理</div><div class="card-body" style="display:flex;gap:12px"><button class="btn-outline" onclick="Settings._exportAll()">📦 导出全部数据</button><button class="btn-danger" onclick="Settings._clearAll()">🗑️ 重置系统数据</button></div></div>';

      document.querySelectorAll('.da').forEach(function(b) { b.onclick = function() {
        var key = b.dataset.k;
        UI.modal('添加字典项', '<div class="form-group"><label>名称</label><input type="text" id="fdv"></div>', { footer: '<button class="btn-outline" onclick="UI.closeModal()">取消</button><button class="btn-primary" id="btn-da">添加</button>' });
        document.getElementById('btn-da').onclick = async function() {
          var v = document.getElementById('fdv').value.trim();
          if (!v) { UI.toast('请输入名称', 'warning'); return; }
          var d = Store.getAll(key);
          var exists = d.some(function(item) { return (typeof item === 'object' ? item.value : item) === v; });
          if (exists) { UI.toast('该项已存在', 'warning'); return; }
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
              if (r && r.status === 404) return null;
              throw r;
            });
            var d = Store.getAll(key);
            if (d.find(function(x) { return x && x.id === itemId; })) {
              Store.remove(key, itemId);
            } else {
              d.splice(idx, 1); Store.saveAll(key, d);
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