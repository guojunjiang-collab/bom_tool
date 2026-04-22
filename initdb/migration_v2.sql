-- 数据迁移脚本 v2.0
-- 日期: 2026-04-22
-- 内容: 删除不需要的字段，迁移附件到独立表

-- 1. 将 parts 表的内联附件数据迁移到 attachments 表
INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'part', id, 'source_file', source_file, source_file_data, created_at, updated_at
FROM parts WHERE source_file_data IS NOT NULL AND source_file_data != '';

INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'part', id, 'drawing', drawing, drawing_data, created_at, updated_at
FROM parts WHERE drawing_data IS NOT NULL AND drawing_data != '';

INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'part', id, 'stp', stp, stp_data, created_at, updated_at
FROM parts WHERE stp_data IS NOT NULL AND stp_data != '';

INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'part', id, 'pdf', pdf, pdf_data, created_at, updated_at
FROM parts WHERE pdf_data IS NOT NULL AND pdf_data != '';

-- 2. 将 assemblies 表的内联附件数据迁移到 attachments 表
INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'component', id, 'source_file', source_file, source_file_data, created_at, updated_at
FROM assemblies WHERE source_file_data IS NOT NULL AND source_file_data != '';

INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'component', id, 'drawing', drawing, drawing_data, created_at, updated_at
FROM assemblies WHERE drawing_data IS NOT NULL AND drawing_data != '';

INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'component', id, 'stp', stp, stp_data, created_at, updated_at
FROM assemblies WHERE stp_data IS NOT NULL AND stp_data != '';

INSERT INTO attachments (id, entity_type, entity_id, file_type, file_name, file_data, created_at, updated_at)
SELECT uuid_generate_v4(), 'component', id, 'pdf', pdf, pdf_data, created_at, updated_at
FROM assemblies WHERE pdf_data IS NOT NULL AND pdf_data != '';

-- 3. 删除 parts 表不需要的字段
ALTER TABLE parts DROP COLUMN IF EXISTS material_id;
ALTER TABLE parts DROP COLUMN IF EXISTS price;
ALTER TABLE parts DROP COLUMN IF EXISTS stock;
ALTER TABLE parts DROP COLUMN IF EXISTS remark;
ALTER TABLE parts DROP COLUMN IF EXISTS source_file;
ALTER TABLE parts DROP COLUMN IF EXISTS source_file_data;
ALTER TABLE parts DROP COLUMN IF EXISTS drawing;
ALTER TABLE parts DROP COLUMN IF EXISTS drawing_data;
ALTER TABLE parts DROP COLUMN IF EXISTS stp;
ALTER TABLE parts DROP COLUMN IF EXISTS stp_data;
ALTER TABLE parts DROP COLUMN IF EXISTS pdf;
ALTER TABLE parts DROP COLUMN IF EXISTS pdf_data;

-- 4. 删除 assemblies 表不需要的字段
ALTER TABLE assemblies DROP COLUMN IF EXISTS price;
ALTER TABLE assemblies DROP COLUMN IF EXISTS remark;
ALTER TABLE assemblies DROP COLUMN IF EXISTS source_file;
ALTER TABLE assemblies DROP COLUMN IF EXISTS source_file_data;
ALTER TABLE assemblies DROP COLUMN IF EXISTS drawing;
ALTER TABLE assemblies DROP COLUMN IF EXISTS drawing_data;
ALTER TABLE assemblies DROP COLUMN IF EXISTS stp;
ALTER TABLE assemblies DROP COLUMN IF EXISTS stp_data;
ALTER TABLE assemblies DROP COLUMN IF EXISTS pdf;
ALTER TABLE assemblies DROP COLUMN IF EXISTS pdf_data;
