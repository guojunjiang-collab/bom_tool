-- 数据库迁移脚本：添加文件路径字段
-- 执行前请备份数据库

-- 1. 添加 file_path 字段到 document_attachments 表
ALTER TABLE document_attachments 
ADD COLUMN IF NOT EXISTS file_path VARCHAR(512);

-- 2. 添加 file_hash 字段到 document_attachments 表
ALTER TABLE document_attachments 
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_document_attachments_file_path 
ON document_attachments(file_path);

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_document_attachments_file_hash 
ON document_attachments(file_hash);

-- 注意：
-- - file_data 字段保留用于向后兼容
-- - 新上传的文件将使用 file_path 存储在文件系统中
-- - 旧文件仍然可以通过 file_data 字段访问
