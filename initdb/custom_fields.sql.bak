-- 自定义字段功能 - 数据库迁移脚本
-- 执行日期: 2026-04-22

-- 1. 自定义字段定义表
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,           -- 字段显示名称，如"供应商"
    field_key VARCHAR(64) NOT NULL UNIQUE, -- 字段标识键，如"supplier"
    field_type VARCHAR(32) NOT NULL,       -- text / number / select / multiselect
    options JSONB DEFAULT '[]',            -- 单选/多选选项列表
    is_required BOOLEAN DEFAULT FALSE,     -- 是否必填
    applies_to VARCHAR(32) NOT NULL DEFAULT 'both', -- part / component / both
    sort_order INTEGER DEFAULT 0,          -- 排序序号
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 自定义字段值表
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(32) NOT NULL,  -- 'part' 或 'component'
    entity_id UUID NOT NULL,           -- 零件或部件的ID
    value_text TEXT,                    -- 文本/单选值
    value_number DECIMAL(12,4),         -- 数字值
    value_json JSONB,                   -- 多选值数组
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(field_id, entity_type, entity_id)
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_cfv_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cfv_field ON custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_cfd_sort ON custom_field_definitions(sort_order);
