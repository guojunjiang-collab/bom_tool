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
    material_id: Optional[uuid.UUID] = None
    version: str = "A"
    price: float = 0.0
    stock: int = 0
    status: str = "draft"
    remark: Optional[str] = None
    revisions: Optional[List[Any]] = None
    source_file: Optional[str] = None
    source_file_data: Optional[str] = None
    drawing: Optional[str] = None
    drawing_data: Optional[str] = None
    stp: Optional[str] = None
    stp_data: Optional[str] = None
    pdf: Optional[str] = None
    pdf_data: Optional[str] = None


class PartCreate(PartBase):
    pass

class PartUpdate(BaseSchema):
    name: Optional[str] = None
    spec: Optional[str] = None
    material_id: Optional[uuid.UUID] = None
    version: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    revisions: Optional[List[Any]] = None
    source_file: Optional[str] = None
    source_file_data: Optional[str] = None
    drawing: Optional[str] = None
    drawing_data: Optional[str] = None
    stp: Optional[str] = None
    stp_data: Optional[str] = None
    pdf: Optional[str] = None
    pdf_data: Optional[str] = None

class PartResponse(PartBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    material: Optional[str] = None  # 字典值，非ID

class AssemblyBase(BaseSchema):
    code: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    spec: Optional[str] = None
    version: str = "A"
    price: float = 0.0
    status: str = "draft"
    remark: Optional[str] = None
    revisions: Optional[List[Any]] = None
    source_file: Optional[str] = None
    source_file_data: Optional[str] = None
    drawing: Optional[str] = None
    drawing_data: Optional[str] = None
    stp: Optional[str] = None
    stp_data: Optional[str] = None
    pdf: Optional[str] = None
    pdf_data: Optional[str] = None

class AssemblyCreate(AssemblyBase):
    pass

class AssemblyUpdate(BaseSchema):
    name: Optional[str] = None
    spec: Optional[str] = None
    version: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    revisions: Optional[List[Any]] = None
    source_file: Optional[str] = None
    source_file_data: Optional[str] = None
    drawing: Optional[str] = None
    drawing_data: Optional[str] = None
    stp: Optional[str] = None
    stp_data: Optional[str] = None
    pdf: Optional[str] = None
    pdf_data: Optional[str] = None

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