from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import uuid
import base64

from ..database import get_db
from ..models import User, Attachment
from .auth import require_role

router = APIRouter(prefix="/attachments", tags=["附件管理"])

def _attachment_response(att):
    return {
        "id": att.id,
        "file_name": att.file_name,
        "created_at": att.created_at,
        "updated_at": att.updated_at,
    }

def _attachment_response_with_data(att):
    """包含文件数据的响应（用于下载）"""
    return {
        "id": att.id,
        "file_name": att.file_name,
        "file_data": base64.b64encode(att.file_data).decode('utf-8') if att.file_data else None,
        "created_at": att.created_at,
        "updated_at": att.updated_at,
    }

@router.get("/")
async def list_attachments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    """获取附件列表"""
    attachments = db.query(Attachment).all()
    return [_attachment_response(a) for a in attachments]

@router.post("/")
async def upload_attachment(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    """上传附件（JSON body: file_name + file_data(Base64)）"""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
    else:
        form = await request.form()
        body = dict(form)

    file_name = body.get("file_name")
    file_data = body.get("file_data")
    att_id = body.get("id")
    if att_id:
        try:
            att_id = uuid.UUID(att_id)
        except Exception:
            att_id = None

    if file_data:
        try:
            file_data = base64.b64decode(file_data)
        except Exception:
            file_data = None

    new_att = Attachment(
        id=att_id,
        file_name=file_name,
        file_data=file_data
    )
    db.add(new_att)
    db.commit()
    db.refresh(new_att)

    return {"id": new_att.id, "message": "附件保存成功"}

@router.get("/{attachment_id}")
async def get_attachment(
    attachment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "engineer"]))
):
    """获取单个附件（包含文件数据，用于下载）"""
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="附件不存在")
    return _attachment_response_with_data(att)

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
