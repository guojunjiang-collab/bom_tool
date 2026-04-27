from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import uuid
import base64

from ..database import get_db
from ..models import User, Document, DocumentAttachment, EntityDocument
from .. import crud, schemas
from .auth import require_role

router = APIRouter(prefix="/documents", tags=["图文档管理"])

@router.get("/")
async def list_documents(skip: int = 0, limit: int = 100, keyword: str = None, status: str = None, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    query = db.query(Document)
    if keyword:
        kw = f"%{keyword.strip().lower()}%"
        query = query.filter(Document.name.ilike(kw))
    if status:
        query = query.filter(Document.status == status)
    docs = query.offset(skip).limit(limit).all()
    return [{
        "id": d.id, "code": d.code, "name": d.name,
        "version": d.version, "status": d.status,
        "description": d.description,
        "file_name": d.file_name, "file_id": d.file_id,
        "created_at": d.created_at, "updated_at": d.updated_at,
    } for d in docs]

@router.post("/")
async def create_document(doc: schemas.DocumentCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    existing = db.query(Document).filter(Document.code == doc.code, Document.version == doc.version).first()
    if existing:
        raise HTTPException(status_code=400, detail="该编号和版本的组合已存在")
    d = Document(**doc.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "创建图文档", "document", str(d.id), f"编号:{d.code}", ip)
    return {
        "id": d.id, "code": d.code, "name": d.name,
        "version": d.version, "status": d.status,
        "description": d.description,
        "file_name": d.file_name, "file_id": d.file_id,
        "created_at": d.created_at, "updated_at": d.updated_at,
    }

@router.get("/{doc_id}")
async def get_document(doc_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="图文档不存在")
    return {
        "id": d.id, "code": d.code, "name": d.name,
        "version": d.version, "status": d.status,
        "description": d.description,
        "file_name": d.file_name, "file_id": d.file_id,
        "created_at": d.created_at, "updated_at": d.updated_at,
    }

@router.put("/{doc_id}")
async def update_document(doc_id: uuid.UUID, body: schemas.DocumentUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="图文档不存在")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(d, field, value)
    db.commit()
    db.refresh(d)
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "更新图文档", "document", str(doc_id), None, ip)
    return {
        "id": d.id, "code": d.code, "name": d.name,
        "version": d.version, "status": d.status,
        "description": d.description,
        "file_name": d.file_name, "file_id": d.file_id,
        "created_at": d.created_at, "updated_at": d.updated_at,
    }

@router.delete("/{doc_id}")
async def delete_document(doc_id: uuid.UUID, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    ref_count = db.query(EntityDocument).filter(EntityDocument.document_id == doc_id).count()
    if ref_count > 0:
        raise HTTPException(status_code=400, detail=f"该图文档已被 {ref_count} 个零部件引用，无法删除")
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="图文档不存在")
    db.query(DocumentAttachment).filter(DocumentAttachment.document_id == doc_id).delete()
    db.delete(d)
    db.commit()
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "删除图文档", "document", str(doc_id), f"编号:{d.code}", ip)
    return {"message": "图文档已删除"}

@router.post("/{doc_id}/attachments")
async def upload_document_attachment(doc_id: uuid.UUID, body: schemas.DocumentAttachmentCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="图文档不存在")
    file_data_bytes = base64.b64decode(body.file_data)
    att = DocumentAttachment(
        id=body.id,
        document_id=doc_id,
        file_name=body.file_name,
        file_data=file_data_bytes,
        file_size=len(file_data_bytes),
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    d.file_name = body.file_name
    d.file_id = att.id
    db.commit()
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "上传附件", "document_att", str(doc_id), f"文件:{body.file_name}", ip)
    return {"id": att.id, "file_name": att.file_name, "file_size": att.file_size, "created_at": att.created_at}

@router.get("/{doc_id}/attachments/{att_id}")
async def download_attachment(doc_id: uuid.UUID, att_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    att = db.query(DocumentAttachment).filter(DocumentAttachment.id == att_id, DocumentAttachment.document_id == doc_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="附件不存在")
    return {
        "id": att.id, "document_id": att.document_id,
        "file_name": att.file_name, "file_size": att.file_size,
        "file_data": base64.b64encode(att.file_data).decode('utf-8') if att.file_data else None,
        "created_at": att.created_at,
    }

@router.get("/{doc_id}/attachments/")
async def list_attachments(doc_id: uuid.UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    atts = db.query(DocumentAttachment).filter(DocumentAttachment.document_id == doc_id).offset(skip).limit(limit).all()
    return [{
        "id": a.id, "document_id": a.document_id,
        "file_name": a.file_name, "file_size": a.file_size, "created_at": a.created_at,
    } for a in atts]

@router.delete("/{doc_id}/attachments/{att_id}")
async def delete_attachment(doc_id: uuid.UUID, att_id: uuid.UUID, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "engineer"]))):
    att = db.query(DocumentAttachment).filter(DocumentAttachment.id == att_id, DocumentAttachment.document_id == doc_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="附件不存在")
    d = db.query(Document).filter(Document.id == doc_id).first()
    if d and d.file_id == att.id:
        d.file_id = None
        d.file_name = None
    db.delete(att)
    db.commit()
    ip = request.client.host if request.client else None
    crud.create_log(db, current_user.id, current_user.username, "删除附件", "document_att", str(doc_id), f"文件ID:{att_id}", ip)
    return {"message": "附件已删除"}
