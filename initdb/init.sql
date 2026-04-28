-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 删除旧的迁移脚本已不需要，所有表定义已合并到此文件

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL,
    department VARCHAR(128),
    phone VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 零件表（已移除旧附件字段）
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    spec VARCHAR(255),
    version VARCHAR(32) DEFAULT 'A',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    revisions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uix_part_code_version UNIQUE (code, version)
);

-- 部件表（已移除旧附件字段）
CREATE TABLE assemblies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    spec VARCHAR(255),
    version VARCHAR(32) DEFAULT 'V1.0',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    revisions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BOM表
CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_type VARCHAR(16) NOT NULL,
    parent_id UUID NOT NULL,
    child_type VARCHAR(16) NOT NULL,
    child_id UUID NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    username VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32),
    target_id VARCHAR(64),
    detail TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 旧附件表（保留以便后向兼容）
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255),
    file_data BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 图文档主表
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(32) DEFAULT 'A',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    description TEXT,
    file_name VARCHAR(255),
    file_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uix_doc_code_version UNIQUE (code, version)
);

-- 图文档独立附件表
CREATE TABLE document_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_data BYTEA,
    file_size INTEGER,
    file_path VARCHAR(512),
    file_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 图文档主附件外键
ALTER TABLE documents ADD CONSTRAINT fk_doc_file
    FOREIGN KEY (file_id) REFERENCES document_attachments(id) ON DELETE SET NULL;

-- 实体-图文档关联表
CREATE TABLE entity_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    category VARCHAR(64),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 字典表
CREATE TABLE dictionaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dict_type VARCHAR(32) NOT NULL,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 自定义字段定义表
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    field_key VARCHAR(64) UNIQUE NOT NULL,
    field_type VARCHAR(32) NOT NULL,
    options JSONB DEFAULT '[]',
    is_required INTEGER DEFAULT 0,
    applies_to VARCHAR(32) NOT NULL DEFAULT 'both',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 自定义字段值表
CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    value_text TEXT,
    value_number DECIMAL(12, 4),
    value_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_parts_code ON parts(code);
CREATE INDEX idx_parts_name ON parts(name);
CREATE INDEX idx_parts_status ON parts(status);
CREATE INDEX idx_assemblies_code ON assemblies(code);
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_bom_parent ON bom_items(parent_type, parent_id);
CREATE INDEX idx_bom_item_child ON bom_items(child_type, child_id);
CREATE INDEX idx_dict_type ON dictionaries(dict_type);
CREATE INDEX idx_cf_def_key ON custom_field_definitions(field_key);
CREATE INDEX idx_cf_val_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_doc_code ON documents(code);
CREATE INDEX idx_doc_status ON documents(status);
CREATE INDEX idx_doc_att_doc ON document_attachments(document_id);
CREATE INDEX idx_ent_doc_entity ON entity_documents(entity_type, entity_id);
CREATE INDEX idx_ent_doc_doc ON entity_documents(document_id);

-- 插入默认用户（密码均为 admin123）
INSERT INTO users (username, password_hash, real_name, role, department, status) VALUES
('admin', '$2b$12$MwgiArsPySEydYloZq.FYu7lixhRufdvZfqC17I2bW4Eo5kRt0Kp2', '系统管理员', 'admin', '信息部', 'active'),
('engineer', '$2b$12$MwgiArsPySEydYloZq.FYu7lixhRufdvZfqC17I2bW4Eo5kRt0Kp2', '张工程师', 'engineer', '研发部', 'active'),
('production', '$2b$12$MwgiArsPySEydYloZq.FYu7lixhRufdvZfqC17I2bW4Eo5kRt0Kp2', '李生产', 'production', '生产部', 'active'),
('guest', '$2b$12$MwgiArsPySEydYloZq.FYu7lixhRufdvZfqC17I2bW4Eo5kRt0Kp2', '访客账户', 'guest', '采购部', 'active');
