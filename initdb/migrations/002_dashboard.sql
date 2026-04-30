-- 用户看板功能迁移脚本
-- 执行前请备份数据库

-- 1. 用户看板主表
CREATE TABLE IF NOT EXISTS user_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    name VARCHAR(128) DEFAULT '我的看板',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_dashboards_user_id ON user_dashboards(user_id);

-- 2. 看板文件夹表
CREATE TABLE IF NOT EXISTS dashboard_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES user_dashboards(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES dashboard_folders(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_folders_dashboard_id ON dashboard_folders(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_folders_parent_id ON dashboard_folders(parent_id);

-- 3. 文件夹内容关联表
CREATE TABLE IF NOT EXISTS dashboard_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES dashboard_folders(id) ON DELETE CASCADE,
    entity_type VARCHAR(16) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_items_folder_id ON dashboard_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_items_entity ON dashboard_items(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS uix_dashboard_item_folder_entity ON dashboard_items(folder_id, entity_type, entity_id);

-- 4. 文件夹共享表
CREATE TABLE IF NOT EXISTS dashboard_folder_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES dashboard_folders(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(16) NOT NULL DEFAULT 'view',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_folder_id ON dashboard_folder_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_user_id ON dashboard_folder_shares(shared_with_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uix_folder_share_user ON dashboard_folder_shares(folder_id, shared_with_user_id);
