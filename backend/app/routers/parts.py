from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import uuid

from ..database import get_db
from ..models import User
from .. import crud, schemas
from .auth import require_role

router = APIRouter(prefix="/parts", tags=["零件管理"])

def _part_response(part, include_attachments=False):
    """将零件模型附加 material 值后转为 dict"""
    result = {
        "id": part.id,
        "code": part.code,
        "name": part.name,
        "spec": part.spec,
        "material_id": part.material_id,
        "version": part.version,
        "price": float(part.price) if part.price else 0.0,
        "stock": part.stock or 0,
        "status": part.status,
        "remark": part.remark,
        "revisions": part.revisions or [],
        "created_at": part.created_at,
        "updated_at": part.updated_at,
        "material": part.material.value if part.material else None,
    }
    # 仅在明确请求时返回附件数据（按需下载）
    if include_attachments:
        result.update({
            "source_file": part.source_file,
            "source_file_data": part.source_file_data,
            "drawing": part.drawing,
            "drawing_data": part.drawing_data,
            "stp": part.stp,
            "stp_data": part.stp_data,
            "pdf": part.pdf,
            "pdf_data": part.pdf_data,
        })
    else:
        # 默认只返回附件文件名，不返回 Base64 数据
        result.update({
            "source_file": part.source_file,
            "drawing": part.drawing,
            "stp": part.stp,
            "pdf": part.pdf,
        })
    return result

@router.get("/", response_model=list[schemas.PartResponse])
async def list_parts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    parts = crud.get_parts(db, skip=skip, limit=limit)
    return [_part_response(p) for p in parts]

@router.post("/", response_model=schemas.PartResponse)
async def create_part(part: schemas.PartCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    # 检查 (code, version) 联合唯一
    if crud.get_part_by_code(db, part.code, part.version):
        raise HTTPException(status_code=400, detail="该编码和版本的组合已存在")
    db_part = crud.create_part(db, part)
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "创建零件", "part", str(db_part.id), f"编码:{part.code} 版本:{part.version}", ip)
    return _part_response(db_part, include_attachments=True)

@router.get("/{part_id}", response_model=schemas.PartResponse)
async def get_part(part_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    db_part = crud.get_part(db, part_id)
    if not db_part:
        raise HTTPException(status_code=404, detail="零件不存在")
    return _part_response(db_part, include_attachments=True)

@router.put("/{part_id}", response_model=schemas.PartResponse)
async def update_part(part_id: uuid.UUID, part_update: schemas.PartUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    db_part = crud.update_part(db, part_id, part_update)
    if not db_part:
        raise HTTPException(status_code=404, detail="零件不存在")
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "更新零件", "part", str(part_id), None, ip)
    return _part_response(db_part, include_attachments=True)

@router.delete("/{part_id}")
async def delete_part(part_id: uuid.UUID, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    db_part = crud.get_part(db, part_id)
    if not db_part:
        raise HTTPException(status_code=404, detail="零件不存在")
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "删除零件", "part", str(part_id), f"编码:{db_part.code}", ip)
    crud.delete_part(db, part_id)
    return {"message": "零件已删除"}