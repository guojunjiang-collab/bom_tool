from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import uuid

from ..database import get_db
from ..models import User
from .. import crud, schemas
from .auth import require_role

router = APIRouter(prefix="/dict", tags=["字典管理"])

DICT_TYPES = ["materials"]

@router.get("/{dict_type}", response_model=list[schemas.DictionaryResponse])
async def list_dictionary(
    dict_type: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    if dict_type not in DICT_TYPES:
        raise HTTPException(status_code=400, detail=f"无效的字典类型，支持的类型: {', '.join(DICT_TYPES)}")
    return crud.get_dictionary_items(db, dict_type, skip=skip, limit=limit)

@router.post("/{dict_type}", response_model=schemas.DictionaryResponse)
async def create_dictionary(
    dict_type: str,
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    if dict_type not in DICT_TYPES:
        raise HTTPException(status_code=400, detail=f"无效的字典类型，支持的类型: {', '.join(DICT_TYPES)}")
    
    value = data.get("value", "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="字典值不能为空")
    
    # 检查是否已存在
    existing = crud.get_dictionary_by_value(db, dict_type, value)
    if existing:
        raise HTTPException(status_code=400, detail="该字典项已存在")
    
    db_dict = crud.create_dictionary(db, dict_type, value)
    
    # 记录日志
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "创建字典", "dictionary", str(db_dict.id), f"类型:{dict_type}, 值:{value}", ip)
    
    return db_dict

@router.put("/{dict_type}/{item_id}", response_model=schemas.DictionaryResponse)
async def update_dictionary(
    dict_type: str,
    item_id: uuid.UUID,
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    if dict_type not in DICT_TYPES:
        raise HTTPException(status_code=400, detail=f"无效的字典类型，支持的类型: {', '.join(DICT_TYPES)}")
    
    value = data.get("value", "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="字典值不能为空")
    
    # 检查是否与其他项重复
    existing = crud.get_dictionary_by_value(db, dict_type, value)
    if existing and existing.id != item_id:
        raise HTTPException(status_code=400, detail="该字典项已存在")
    
    db_dict = crud.update_dictionary(db, item_id, value)
    if not db_dict:
        raise HTTPException(status_code=404, detail="字典项不存在")
    
    # 记录日志
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "更新字典", "dictionary", str(item_id), f"类型:{dict_type}, 新值:{value}", ip)
    
    return db_dict

@router.delete("/{dict_type}/{item_id}")
async def delete_dictionary(
    dict_type: str,
    item_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    if dict_type not in DICT_TYPES:
        raise HTTPException(status_code=400, detail=f"无效的字典类型，支持的类型: {', '.join(DICT_TYPES)}")
    
    db_dict = crud.delete_dictionary(db, item_id)
    if not db_dict:
        raise HTTPException(status_code=404, detail="字典项不存在")
    
    # 记录日志
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "删除字典", "dictionary", str(item_id), f"类型:{dict_type}, 值:{db_dict.value}", ip)
    
    return {"message": "字典项已删除"}
