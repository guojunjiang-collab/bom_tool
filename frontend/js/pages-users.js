var Users = {

  // 用户管理页面
  render: function(c) {
    var users = Store.getAll('users');
    var currentUser = Auth.getUser();
    var isAdmin = currentUser && currentUser.role === 'admin';
    c.innerHTML =
      '<div class="page-header"><h2>👥 用户管理</h2><div class="actions"><button class="btn-primary" id="btn-add-u">＋ 新增用户</button></div></div>' +
      '<div class="card"><div class="table-wrapper"><table><thead><tr><th>用户名</th><th>姓名</th><th>角色</th><th>部门</th><th>联系电话</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
      users.map(function(u) {
        var isSelf = currentUser && u.id === currentUser.id;
        var deleteBtn = isAdmin && !isSelf ? '<button class="btn-text danger" onclick="Users._deleteUser(\'' + u.id + '\')">删除</button>' : '';
        return '<tr><td><strong>' + u.username + '</strong>' + (isSelf ? ' <span style="color:#1890ff;font-size:12px">(我)</span>' : '') + '</td><td>' + u.realName + '</td><td>' + UI.roleTag(u.role) + '</td><td>' + (u.department||'-') + '</td><td>' + (u.phone||'-') + '</td><td>' + UI.statusTag(u.status) + '</td><td><button class="btn-text" onclick="Users._editUser(\'' + u.id + '\')">编辑</button><button class="btn-text" onclick="Users._resetPwd(\'' + u.id + '\')">重置密码</button><button class="btn-text danger" onclick="Users._toggleUser(\'' + u.id + '\')">' + (u.status === 'active' ? '禁用' : '启用') + '</button>' + deleteBtn + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
    document.getElementById('btn-add-u').onclick = function() { Users._editUser(null); };
  },

  _deleteUser: function(id) {
    var currentUser = Auth.getUser();
    var isAdmin = currentUser && currentUser.role === 'admin';
    if (!isAdmin) { UI.toast('只有管理员可以删除用户', 'error'); return; }
    var u = Store.getById('users', id);
    if (!u) return;
    if (id === currentUser.id) { UI.toast('不能删除当前登录的用户', 'error'); return; }
    UI.confirm('确定要删除用户 <strong>' + u.username + ' - ' + u.realName + '</strong> 吗？此操作不可恢复！', function() {
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

  _resetPwd: function(id) {
    UI.confirm('确定要将密码重置为 123456 吗？', function() {
      Store.update('users', id, { password:'123456' });
      Store.addLog('重置密码', '重置用户ID ' + id + ' 的密码');
      UI.toast('密码已重置', 'success');
    });
  },

  _toggleUser: function(id) {
    var u = Store.getById('users', id);
    if (!u) return;
    var ns = u.status === 'active' ? 'disabled' : 'active';
    Store.update('users', id, { status:ns });
    Store.addLog('切换用户状态', u.username + ' → ' + (ns === 'active' ? '启用' : '禁用'));
    UI.toast('用户已' + (ns === 'active' ? '启用' : '禁用'), 'success');
    Router.render();
  }
};