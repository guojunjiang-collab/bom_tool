// 最终验证：const 变量在作用域内可访问
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// 最小浏览器模拟
global.localStorage = { _data: {}, getItem(k) { return this._data[k] || null; }, setItem(k, v) { this._data[k] = v; }, removeItem(k) { delete this._data[k]; }, clear() { this._data = {}; } };
global.document = { getElementById: () => ({ style: {}, onclick: null, onkeydown: null, textContent: '', addEventListener: () => {} }), querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {}, createElement: () => ({}) };
global.window = global;
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
global.setTimeout = setTimeout;
global.setInterval = () => {};
global.alert = () => {};

const JS_DIR = path.join(__dirname, 'js');
const modules = ['utils', 'api', 'store', 'auth', 'ui', 'router', 'pages', 'sync-manager', 'sync-panel', 'init'];

// 加载所有模块
let allCode = '';
for (const mod of modules) {
    allCode += fs.readFileSync(path.join(JS_DIR, mod + '.js'), 'utf-8') + '\n';
}

// 在代码末尾添加验证
allCode += `
;(function() {
    var checks = {
        '_esc': typeof _esc,
        '_uuid': typeof _uuid,
        'API': typeof API,
        'Store': typeof Store,
        'Auth': typeof Auth,
        'UI': typeof UI,
        'Router': typeof Router,
        'Pages': typeof Pages,
        'SyncManager': typeof SyncManager,
        'SyncPanel': typeof SyncPanel,
    };
    var missing = Object.entries(checks).filter(([k,v]) => v === 'undefined');
    if (missing.length > 0) {
        console.log('缺失: ' + missing.map(([k]) => k).join(', '));
    } else {
        console.log('ALL_OK: 10/10 全局对象验证通过');
        // 深度检查关键方法
        console.log('API methods: ' + Object.keys(API).filter(k => typeof API[k]==='function').join(', '));
        console.log('Store methods: ' + Object.keys(Store).filter(k => typeof Store[k]==='function').slice(0,10).join(', ') + '...');
        console.log('Pages methods: ' + Object.keys(Pages).filter(k => typeof Pages[k]==='function').join(', '));
    }
})();
`;

try {
    vm.runInThisContext(allCode, { filename: 'all-modules.js' });
} catch (e) {
    console.log('❌ 加载失败:', e.message.split('\n')[0]);
}
