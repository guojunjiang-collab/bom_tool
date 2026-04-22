import uuid
from sqlalchemy import Column, String, Integer, DateTime, Numeric, Text, JSON, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    real_name = Column(String(64), nullable=False)
    role = Column(String(32), nullable=False)
    department = Column(String(128))
    phone = Column(String(32))
    status = Column(String(32), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Part(Base):
    __tablename__ = "parts"
    __table_args__ = (UniqueConstraint('code', 'version', name='uix_part_code_version'),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    spec = Column(String(255))
    material_id = Column(UUID(as_uuid=True), ForeignKey('dictionaries.id', ondelete='SET NULL'), nullable=True)
    version = Column(String(32), default="A")
    price = Column(Numeric(12, 2), default=0.0)
    stock = Column(Integer, default=0)
    status = Column(String(32), nullable=False, default="draft")
    remark = Column(Text)
    revisions = Column(JSONB, default=[])
    source_file = Column(Text, nullable=True)      # 源文件名
    source_file_data = Column(Text, nullable=True)  # 源文件Base64
    drawing = Column(Text, nullable=True)           # 图纸文件名
    drawing_data = Column(Text, nullable=True)      # 图纸Base64
    stp = Column(Text, nullable=True)               # STP文件名
    stp_data = Column(Text, nullable=True)         # STP Base64
    pdf = Column(Text, nullable=True)               # PDF文件名
    pdf_data = Column(Text, nullable=True)          # PDF Base64
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # 关系：零件 → 材质字典（通过 Dictionary 表）
    material = relationship('Dictionary', foreign_keys=[material_id])

class Assembly(Base):
    __tablename__ = "assemblies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(64), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    spec = Column(String(255))
    version = Column(String(32), default="V1.0")
    price = Column(Numeric(12, 2), default=0.0)
    status = Column(String(32), nullable=False, default="draft")
    remark = Column(Text)
    revisions = Column(JSONB, default=[])
    source_file = Column(Text, nullable=True)
    source_file_data = Column(Text, nullable=True)
    drawing = Column(Text, nullable=True)
    drawing_data = Column(Text, nullable=True)
    stp = Column(Text, nullable=True)
    stp_data = Column(Text, nullable=True)
    pdf = Column(Text, nullable=True)
    pdf_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class BOMItem(Base):
    __tablename__ = "bom_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_type = Column(String(16), nullable=False)
    parent_id = Column(UUID(as_uuid=True), nullable=False)
    child_type = Column(String(16), nullable=False)
    child_id = Column(UUID(as_uuid=True), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class OperationLog(Base):
    __tablename__ = "operation_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True))
    username = Column(String(64))
    action = Column(String(64), nullable=False)
    target_type = Column(String(32))
    target_id = Column(String(64))
    detail = Column(Text)
    ip_address = Column(String(64))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Attachment(Base):
    """附件表：独立存储零部件的附件数据"""
    __tablename__ = "attachments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(32), nullable=False)  # 'part' or 'component'
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    file_type = Column(String(32), nullable=False)    # 'source_file', 'drawing', 'stp', 'pdf'
    file_name = Column(String(255))
    file_data = Column(Text)  # Base64 encoded file content
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Dictionary(Base):
    __tablename__ = "dictionaries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dict_type = Column(String(32), nullable=False)  # material, unit, supplier, product
    value = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class CustomFieldDefinition(Base):
    """自定义字段定义表"""
    __tablename__ = "custom_field_definitions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(128), nullable=False)           # 字段显示名称
    field_key = Column(String(64), unique=True, nullable=False)  # 字段标识键
    field_type = Column(String(32), nullable=False)      # text / number / select / multiselect
    options = Column(JSONB, default=[])                   # 单选/多选选项列表
    is_required = Column(Integer, default=0)              # 是否必填（数据库是 BOOLEAN，用 Integer 兼容）
    applies_to = Column(String(32), nullable=False, default='both')  # part / component / both
    sort_order = Column(Integer, default=0)               # 排序序号
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class CustomFieldValue(Base):
    """自定义字段值表"""
    __tablename__ = "custom_field_values"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = Column(UUID(as_uuid=True), ForeignKey('custom_field_definitions.id', ondelete='CASCADE'), nullable=False)
    entity_type = Column(String(32), nullable=False)  # 'part' 或 'component'
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    value_text = Column(Text, nullable=True)           # 文本/单选值
    value_number = Column(Numeric(12, 4), nullable=True)  # 数字值
    value_json = Column(JSONB, nullable=True)           # 多选值数组
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
