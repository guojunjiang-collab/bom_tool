from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from ..database import get_db
from ..models import User, Attachment
from .auth import require_role

router = APIRouter(prefix="/attachments", tags=["附件管理"])

def _attachment_response(att):
    return {
        "id": att.id,
        "entity_type": att.entity_type,
        "entity_id": att.entity_id,
        "file_type": att.file_type,
        "file_name": att.file_name,
        "file_data": att.file_data,
        "created_at": att.created_at,
        "updated_at": att.updated_at,
    }

@router.get("/")
async def list_attachments(
    entity_type: str = None,
    entity_id: uuid.UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    """获取附件列表，可按 entity_type 和 entity_id 过滤"""
    query = db.query(Attachment)
    if entity_type:
        query = query.filter(Attachment.entity_type == entity_type)
    if entity_id:
        query = query.filter(Attachment.entity_id == entity_id)
    attachments = query.all()
    return [_attachment_response(a) for a in attachments]

@router.post("/")
async def upload_attachment(
    entity_type: str,
    entity_id: uuid.UUID,
    file_type: str,
    file_name: str = None,
    file_data: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    """上传/更新附件"""
    if entity_type not in ('part', 'component'):
        raise HTTPException(status_code=400, detail="无效的 entity_type")
    if file_type not in ('source_file', 'drawing', 'stp', 'pdf'):
        raise HTTPException(status_code=400, detail="无效的 file_type")
    
    # 查找已存在的附件记录
    existing = db.query(Attachment).filter(
        Attachment.entity_type == entity_type,
        Attachment.entity_id == entity_id,
        Attachment.file_type == file_type
    ).first()
    
    if existing:
        # 更新
        existing.file_name = file_name
        existing.file_data = file_data
    else:
        # 创建
        new_att = Attachment(
            entity_type=entity_type,
            entity_id=entity_id,
            file_type=file_type,
            file_name=file_name,
            file_data=file_data
        )
        db.add(new_att)
    
    db.commit()
    return {"message": "附件保存成功"}

@router.get("/{attachment_id}")
async def get_attachment(
    attachment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    """获取单个附件（包含 Base64 数据）"""
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="附件不存在")
    return _attachment_response(att)

@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    """删除附件"""
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="附件不存在")
    db.delete(att)
    db.commit()
    return {"message": "附件已删除"}