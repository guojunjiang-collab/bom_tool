-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 零件表
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    spec VARCHAR(255),
    price DECIMAL(12, 2) DEFAULT 0.0,
    stock INTEGER DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 部件表
CREATE TABLE assemblies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    spec VARCHAR(255),
    version VARCHAR(32) DEFAULT 'V1.0',
    price DECIMAL(12, 2) DEFAULT 0.0,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    remark TEXT,
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
    loss_rate DECIMAL(5, 4) DEFAULT 0.0,
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

-- 插入默认用户（密码均为 123456，bcrypt hash of "123456"）
INSERT INTO users (username, password_hash, real_name, role, department, status) VALUES 
('admin', '$2b$12$1wM90LwfNpoixTOjqG3nk.ssJIyyIoVzMf3ORPc3pZKeTMeK6zHTm', '系统管理员', 'admin', '信息部', 'active'),
('engineer', '$2b$12$1wM90LwfNpoixTOjqG3nk.ssJIyyIoVzMf3ORPc3pZKeTMeK6zHTm', '张工程师', 'engineer', '研发部', 'active'),
('production', '$2b$12$1wM90LwfNpoixTOjqG3nk.ssJIyyIoVzMf3ORPc3pZKeTMeK6zHTm', '李生产', 'production', '生产部', 'active'),
('guest', '$2b$12$1wM90LwfNpoixTOjqG3nk.ssJIyyIoVzMf3ORPc3pZKeTMeK6zHTm', '访客账户', 'guest', '采购部', 'active');
