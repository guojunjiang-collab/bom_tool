from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Any, Dict
import uuid

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseSchema):
    username: str = Field(..., min_length=3, max_length=64)
    real_name: str = Field(..., min_length=1, max_length=64)
    role: str = Field(...)
    department: Optional[str] = None
    phone: Optional[str] = None
    status: str = "active"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseSchema):
    real_name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class PartBase(BaseSchema):
    code: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    spec: Optional[str] = None
    version: str = "A"
    status: str = "draft"
    revisions: Optional[List[Any]] = None


class PartCreate(PartBase):
    pass

class PartUpdate(BaseSchema):
    name: Optional[str] = None
    spec: Optional[str] = None
    version: Optional[str] = None
    status: Optional[str] = None
    revisions: Optional[List[Any]] = None

class PartResponse(PartBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class AssemblyBase(BaseSchema):
    code: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    spec: Optional[str] = None
    version: str = "V1.0"
    status: str = "draft"
    revisions: Optional[List[Any]] = None

class AssemblyCreate(AssemblyBase):
    pass

class AssemblyUpdate(BaseSchema):
    name: Optional[str] = None
    spec: Optional[str] = None
    version: Optional[str] = None
    status: Optional[str] = None
    revisions: Optional[List[Any]] = None

class AssemblyResponse(AssemblyBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class BOMItemBase(BaseSchema):
    parent_type: str = "assembly"   # 后端接口会覆盖此字段
    parent_id: Optional[uuid.UUID] = None  # 后端接口会覆盖此字段
    child_type: str
    child_id: uuid.UUID
    quantity: float = 1.0

class BOMItemCreate(BOMItemBase):
    pass

class BOMItemUpdate(BaseSchema):
    quantity: Optional[float] = None

class BOMItemResponse(BOMItemBase):
    id: uuid.UUID
    created_at: datetime
    child_detail: Optional[dict] = None

class Token(BaseSchema):
    access_token: str
    token_type: str

class TokenData(BaseSchema):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseSchema):
    username: str
    password: str

class ChangePasswordRequest(BaseSchema):
    old_password: str
    new_password: str

class LogResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

class DictionaryBase(BaseSchema):
    dict_type: str = Field(..., min_length=1, max_length=32)
    value: str = Field(..., min_length=1, max_length=255)

class DictionaryCreate(DictionaryBase):
    pass

class DictionaryUpdate(BaseSchema):
    value: Optional[str] = None

class DictionaryResponse(DictionaryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class BOMCompareOptions(BaseSchema):
    """BOM对比选项"""
    ignore_quantity: bool = False
    max_depth: int = 10
    include_internal_change: bool = True

class BOMCompareRequest(BaseSchema):
    """BOM对比请求体"""
    left_assembly_id: uuid.UUID
    right_assembly_id: uuid.UUID
    options: BOMCompareOptions = BOMCompareOptions()

class BOMCompareNode(BaseSchema):
    """对比节点"""
    key: str
    level: int
    sort: str
    change_type: str  # none, add, delete, modify, internal
    left: Optional[Dict[str, Any]] = None
    right: Optional[Dict[str, Any]] = None

class BOMCompareResponse(BaseSchema):
    """BOM对比响应"""
    left_assembly: Dict[str, Any]
    right_assembly: Dict[str, Any]
    comparison: List[BOMCompareNode]
    summary: Dict[str, int]


# ===== 自定义字段 Schema =====

class CustomFieldDefinitionBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=128)
    field_key: str = Field(..., min_length=1, max_length=64, pattern=r'^[a-zA-Z][a-zA-Z0-9_]*$')
    field_type: str = Field(..., pattern=r'^(text|number|select|multiselect)$')
    options: Optional[List[str]] = None
    is_required: bool = False
    applies_to: str = Field(default='both', pattern=r'^(part|component|both)$')
    sort_order: int = 0

class CustomFieldDefinitionCreate(CustomFieldDefinitionBase):
    pass

class CustomFieldDefinitionUpdate(BaseSchema):
    name: Optional[str] = None
    field_type: Optional[str] = None
    options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    applies_to: Optional[str] = None
    sort_order: Optional[int] = None

class CustomFieldDefinitionResponse(CustomFieldDefinitionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CustomFieldValueItem(BaseSchema):
    """单个字段的值"""
    field_id: uuid.UUID
    value: Optional[Any] = None  # 可以是 str / number / list[str]

class CustomFieldValuesBatch(BaseSchema):
    """批量设置字段值的请求"""
    values: List[CustomFieldValueItem]

class CustomFieldValueResponse(BaseSchema):
    """字段值响应"""
    field_id: uuid.UUID
    field_key: Optional[str] = None
    field_name: Optional[str] = None
    field_type: Optional[str] = None
    value: Optional[Any] = None


class ReorderItem(BaseSchema):
    id: uuid.UUID
    sort_order: int

class ReorderRequest(BaseSchema):
    items: List[ReorderItem]