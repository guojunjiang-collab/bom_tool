/* App Init */
document.addEventListener('DOMContentLoaded', function() {
  // 保护 Store.init，出错不影响登录
  try { Store.init(); } catch(e) { console.warn('[Store.init]', e); }

  // 初始化同步管理器
  try { SyncManager.init(); } catch(e) { console.warn('[SyncManager.init]', e); }

  document.getElementById('login-btn').onclick = async function(e) {
    e.preventDefault();
    var u = document.getElementById('login-user').value.trim();
    var p = document.getElementById('login-pass').value.trim();
    if (!u || !p) { UI.toast('请输入用户名和密码', 'warning'); return; }
    try {
      var ok = await Auth.login(u, p);
      if (ok) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        Router.init();
        UI.toast('登录成功，欢迎使用BOM管理系统', 'success');
      } else { UI.toast('用户名或密码错误', 'error'); }
    } catch(e) {
      // API 超时/网络错误时回退到本地登录
      var user = Store.getAll('users').find(x => x.username === u && x.password === p && x.status === 'active');
      if (user) {
        localStorage.setItem(Auth._key, JSON.stringify(user));
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        Router.init();
        UI.toast('登录成功（离线模式）', 'success');
      } else { UI.toast('用户名或密码错误', 'error'); }
    }
  };
  document.getElementById('login-pass').onkeydown = function(e) { if (e.key === 'Enter') document.getElementById('login-btn').click(); };
  if (Auth.getUser()) { document.getElementById('login-page').style.display = 'none'; document.getElementById('app').style.display = 'flex'; Router.init(); }
});

// 页面加载完成后初始化同步面板
// SyncPanel 已在 index.html 的内联脚本中初始化
