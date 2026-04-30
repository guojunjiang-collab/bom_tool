/**
 * pages.js - 已拆分为独立模块
 * 
 * 本文件已拆分为以下独立模块文件：
 *   pages-dashboard.js   仪表盘          → Dashboard
 *   pages-board.js       用户看板        → Board
 *   pages-logs.js        操作日志        → Logs
 *   pages-parts.js       零件管理        → Parts
 *   pages-components.js  部件管理        → Components
 *   pages-bom.js         BOM管理         → Bom
 *   pages-users.js       用户管理        → Users
 *   pages-settings.js    系统设置        → Settings
 * 
 * 路由由 router.js 直接引用各模块对象（如 Dashboard.render、Parts.render 等）。
 * 如需修改某个页面，请编辑对应的 pages-*.js 文件。
 * 
 * 本文件仅保留兼容代理，确保旧代码中 Pages.xxx 调用仍可正常工作。
 */

var Pages = {};

// ===== 兼容代理：将 Pages.xxx 指向已拆分的模块 =====

// Dashboard（仪表盘）
if (typeof Dashboard !== 'undefined') {
  Pages.dashboard = Dashboard.render;
}

// Logs（操作日志）
if (typeof Logs !== 'undefined') {
  Pages.logs = Logs.render;
}

// Parts（零件管理）
if (typeof Parts !== 'undefined') {
  Pages.parts = Parts.render;
  Pages._exportParts = Parts._exportParts;
  Pages._editPart = Parts._editPart;
  Pages._onFileChange = Parts._onFileChange;
  Pages._refreshPartAttachmentPreview = Parts._refreshPartAttachmentPreview;
  Pages._onCompFileChange = Parts._onCompFileChange;
  Pages._deletePartAttachment = Parts._deletePartAttachment;
  Pages._deleteCompAttachment = Parts._deleteCompAttachment;
  Pages._deletePart = Parts._deletePart;
  Pages._upgradePart = Parts._upgradePart;
  Pages._viewPart = Parts._viewPart;
}

// Components（部件管理）
if (typeof Components !== 'undefined') {
  Pages.components = Components.render;
  Pages._exportBom = Components._exportBom;
  Pages._viewComp = Components._viewComp;
  Pages._editComp = Components._editComp;
  Pages._renderChildItems = Components._renderChildItems;
  Pages._updateChildItem = Components._updateChildItem;
  Pages._removeChildItem = Components._removeChildItem;
  Pages._showChildSelector = Components._showChildSelector;
  Pages._addChildItem = Components._addChildItem;
  Pages._deleteComp = Components._deleteComp;
  Pages._upgradeComp = Components._upgradeComp;
}

// Bom（BOM管理）
if (typeof Bom !== 'undefined') {
  Pages.bom = Bom.render;
}

// Users（用户管理）
if (typeof Users !== 'undefined') {
  Pages.users = Users.render;
  Pages._deleteUser = Users._deleteUser;
  Pages._editUser = Users._editUser;
  Pages._resetPwd = Users._resetPwd;
  Pages._toggleUser = Users._toggleUser;
}

// Settings（系统设置）
if (typeof Settings !== 'undefined') {
  Pages.settings = Settings.render;
  Pages._exportAll = Settings._exportAll;
  Pages._clearAll = Settings._clearAll;
}
