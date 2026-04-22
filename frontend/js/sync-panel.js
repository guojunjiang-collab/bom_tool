const SyncPanel = {

  // 初始化面板

  init: function() {
    const panel = document.getElementById('sync-panel');
    if (!panel) return;
    
    // 绑定事件
    document.getElementById('sync-panel-toggle').onclick = () => this.toggleMinimize();
    document.getElementById('sync-panel-close').onclick = () => this.hide();
    document.getElementById('sync-clear-completed').onclick = () => this.clearCompleted();
    document.getElementById('sync-retry-failed').onclick = () => this.retryAllFailed();
    document.getElementById('sync-pause-btn').onclick = () => this.togglePause();
    document.getElementById('sync-force-sync').onclick = () => this.forceSync();
    
    // 开始监听队列变化
    this.updatePanel();
    setInterval(() => this.updatePanel(), 2000); // 每2秒更新一次
    
    // 初始状态：展开
    this.minimized = false;
  },
  
  // 更新面板显示
  updatePanel: function() {
    if (!Store) return;
    const queue = Store._syncQueue || [];
    const stats = this.calcStats(queue);
    
    // 更新统计数字
    document.getElementById('sync-stat-pending').textContent = stats.pending;
    document.getElementById('sync-stat-uploading').textContent = stats.uploading;
    document.getElementById('sync-stat-success').textContent = stats.success;
    document.getElementById('sync-stat-error').textContent = stats.error;
    
    // 更新徽章
    const badge = document.getElementById('sync-panel-badge');
    if (badge) {
      badge.textContent = stats.pending > 0 ? `${stats.pending}待处理` : '0待处理';
      badge.style.background = stats.pending > 0 ? '#1890ff' : '#999';
    }
    
    // 显示/隐藏当前任务
    const currentTaskEl = document.getElementById('sync-current-task');
    const currentTask = Store._currentTask;
    if (currentTask) {
      currentTaskEl.style.display = 'block';
      // 生成任务描述
      const typeMap = { parts: '零件', components: '部件', users: '用户', bom_items: 'BOM项' };
      const opMap = { add: '创建', update: '更新', delete: '删除' };
      const entityName = typeMap[currentTask.entity] || currentTask.entity;
      const opName = opMap[currentTask.op] || currentTask.op;
      const desc = `${opName} ${entityName} · ${currentTask.record?.code || currentTask.record?.id || ''}`;
      document.getElementById('sync-task-title').textContent = desc;
      // 进度模拟：根据任务类型显示不同进度，实际应该从_execSync获取进度
      document.getElementById('sync-task-progress').textContent = '上传中...';
      document.getElementById('sync-progress-fill').style.width = '60%';
    } else {
      currentTaskEl.style.display = 'none';
    }
    
    // 更新队列列表
    this.renderQueueList(queue);
  },
  
  // 计算统计信息
  calcStats: function(queue) {
    if (!Store) return { pending: 0, uploading: 0, success: 0, error: 0 };
    const pending = queue.length;
    const uploading = Store._currentTask ? 1 : 0;
    const success = Store._syncStats ? Store._syncStats.success : 0;
    const error = Store._syncStats ? Store._syncStats.failed : 0;
    return {
      pending: pending,
      uploading: uploading,
      success: success,
      error: error
    };
  },
  
  // 渲染队列列表
  renderQueueList: function(queue) {
    const listEl = document.getElementById('sync-queue-list');
    if (!listEl) return;
    
    if (queue.length === 0) {
      listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#999;font-size:12px">上传队列为空</div>';
      return;
    }
    
    let html = '';
    queue.forEach((item, idx) => {
      const typeMap = { parts: '零件', components: '部件', users: '用户', bom_items: 'BOM项' };
      const opMap = { add: '创建', update: '更新', delete: '删除' };
      const entityName = typeMap[item.entity] || item.entity;
      const opName = opMap[item.op] || item.op;
      const desc = `${opName} ${entityName} · ${item.record?.code || item.record?.id || ''}`;
      
      html += `
        <div class="queue-item">
          <div class="status-indicator status-pending"></div>
          <div class="queue-item-content">
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:13px">${desc}</span>
              <span style="font-size:11px;color:#999">等待中</span>
            </div>
            <div style="font-size:11px;color:#666;margin-top:2px">本地 → 服务器</div>
          </div>
          <div class="queue-item-actions">
            <button class="btn-text-small" onclick="SyncPanel.retryItem(${idx})" title="重试">重试</button>
            <button class="btn-text-small" onclick="SyncPanel.cancelItem(${idx})" title="取消">×</button>
          </div>
        </div>
      `;
    });
    
    listEl.innerHTML = html;
  },
  
  // 最小化/展开面板
  toggleMinimize: function() {
    const panel = document.getElementById('sync-panel');
    if (!panel) return;
    this.minimized = !this.minimized;
    panel.classList.toggle('minimized', this.minimized);
    const toggleBtn = document.getElementById('sync-panel-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.minimized ? '+' : '−';
      toggleBtn.title = this.minimized ? '展开' : '最小化';
    }
  },
  
  // 隐藏面板
  hide: function() {
    const panel = document.getElementById('sync-panel');
    if (panel) panel.style.display = 'none';
  },
  
  // 显示面板
  show: function() {
    const panel = document.getElementById('sync-panel');
    if (panel) panel.style.display = 'block';
  },
  
  // 清除已完成的任务
  clearCompleted: function() {
    if (!Store || !Store._taskHistory) return;
    // 移除所有状态为 'success' 的历史记录
    const before = Store._taskHistory.length;
    Store._taskHistory = Store._taskHistory.filter(item => item.status !== 'success');
    const removed = before - Store._taskHistory.length;
    this.updatePanel();
    UI.toast(`已清除 ${removed} 个已完成任务`, 'success');
  },
  
  // 暂停/继续同步
  togglePause: function() {
    if (Store._syncRunning) {
      Store._syncRunning = false;
      document.getElementById('sync-pause-btn').textContent = '继续';
      UI.toast('检出已暂停', 'warning');
    } else {
      Store._syncRunning = true;
      document.getElementById('sync-pause-btn').textContent = '暂停';
      Store._processQueue();
      UI.toast('检出已继续', 'info');
    }
  },
  
  // 强制立即同步
  forceSync: function() {
    if (Store._syncRunning) {
      UI.toast('检出已在运行中', 'info');
      return;
    }
    Store._processQueue();
    UI.toast('已触发立即检出', 'success');
  },
  
  // 重试所有失败任务
  retryAllFailed: function() {
    if (!Store || !Store._taskHistory) return;
    const failedTasks = Store._taskHistory.filter(item => item.status === 'failed');
    if (failedTasks.length === 0) {
      UI.toast('没有失败任务可重试', 'info');
      return;
    }
    // 将失败任务重新加入同步队列
    failedTasks.forEach(failed => {
      Store._syncQueue.push(failed.task);
      // 从历史记录中移除该失败记录（避免重复）
      Store._taskHistory = Store._taskHistory.filter(item => item !== failed);
    });
    this.updatePanel();
    UI.toast(`已重试 ${failedTasks.length} 个失败任务`, 'success');
    // 自动开始同步
    if (!Store._syncRunning) {
      Store._processQueue();
    }
  },

  // 重试单个任务
  retryItem: function(index) {
    UI.toast(`重试任务 #${index}`, 'info');
    // 实际实现需要将任务重新加入队列
  },
  
  // 取消单个任务
  cancelItem: function(index) {
    if (Store._syncQueue && Store._syncQueue[index]) {
      Store._syncQueue.splice(index, 1);
      this.updatePanel();
      UI.toast('任务已取消', 'info');
    }
  }
};
