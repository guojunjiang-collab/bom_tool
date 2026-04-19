import uuid
from sqlalchemy.orm import Session
from . import models, schemas
import bcrypt

def verify_password(plain_password, hashed_password):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def get_user(db, user_id):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db, username):
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db, skip=0, limit=100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db, user):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username, password_hash=hashed_password,
        real_name=user.real_name, role=user.role,
        department=user.department, phone=user.phone, status=user.status
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db, user_id, user_update):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(db_user, field, value)
    from datetime import datetime
    db_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db, user_id):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user

def authenticate_user(db, username, password):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def get_part(db, part_id):
    return db.query(models.Part).filter(models.Part.id == part_id).first()

def get_part_by_code(db, code, version=None):
    if version:
        return db.query(models.Part).filter(models.Part.code == code, models.Part.version == version).first()
    return db.query(models.Part).filter(models.Part.code == code).first()

def get_parts(db, skip=0, limit=100):
    return db.query(models.Part).offset(skip).limit(limit).all()

def create_part(db, part):
    db_part = models.Part(**part.model_dump())
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part

def update_part(db, part_id, part_update):
    db_part = get_part(db, part_id)
    if not db_part:
        return None
    for field, value in part_update.model_dump(exclude_unset=True).items():
        setattr(db_part, field, value)
    from datetime import datetime
    db_part.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_part)
    return db_part

def delete_part(db, part_id):
    # 删除所有引用该零件的 BOM items（该零件作为子项被引用）
    db.query(models.BOMItem).filter(
        models.BOMItem.child_type == 'part',
        models.BOMItem.child_id == part_id
    ).delete(synchronize_session=False)
    db.commit()
    # 删除零件主体
    db_part = get_part(db, part_id)
    if db_part:
        db.delete(db_part)
        db.commit()
    return db_part

def get_assembly(db, assembly_id):
    return db.query(models.Assembly).filter(models.Assembly.id == assembly_id).first()

def get_all_bom_items(db):
    """获取所有 BOM 关系，用于前端反查"""
    return db.query(models.BOMItem).all()

def get_assembly_by_code(db, code):
    return db.query(models.Assembly).filter(models.Assembly.code == code).first()

def get_assembly_by_code_version(db, code, version):
    """按编码+版本号精确查找部件（支持同编码多版本）"""
    return db.query(models.Assembly).filter(
        models.Assembly.code == code,
        models.Assembly.version == version
    ).first()

def get_assemblies(db, skip=0, limit=100):
    return db.query(models.Assembly).offset(skip).limit(limit).all()

def create_assembly(db, assembly):
    db_assembly = models.Assembly(**assembly.model_dump())
    db.add(db_assembly)
    db.commit()
    db.refresh(db_assembly)
    return db_assembly

def update_assembly(db, assembly_id, assembly_update):
    db_assembly = get_assembly(db, assembly_id)
    if not db_assembly:
        return None
    for field, value in assembly_update.model_dump(exclude_unset=True).items():
        setattr(db_assembly, field, value)
    from datetime import datetime
    db_assembly.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_assembly)
    return db_assembly

def delete_assembly(db, assembly_id):
    # 删除该部件"拥有"的 BOM items（它的子项）
    db.query(models.BOMItem).filter(
        models.BOMItem.parent_type == 'assembly',
        models.BOMItem.parent_id == assembly_id
    ).delete(synchronize_session=False)
    # 删除所有引用该部件的 BOM items（该部件作为子项被其他部件引用）
    db.query(models.BOMItem).filter(
        models.BOMItem.child_type == 'assembly',
        models.BOMItem.child_id == assembly_id
    ).delete(synchronize_session=False)
    db.commit()
    # 删除部件主体
    db_assembly = get_assembly(db, assembly_id)
    if db_assembly:
        db.delete(db_assembly)
        db.commit()
    return db_assembly

def get_assembly_parts(db, assembly_id):
    """获取部件的子项列表，包含零件和部件的详细信息（返回本地格式）"""
    items = db.query(models.BOMItem).filter(
        models.BOMItem.parent_type == "assembly",
        models.BOMItem.parent_id == assembly_id
    ).all()
    
    result = []
    for item in items:
        # 确定本地格式的 childType
        child_type = item.child_type
        child_type_local = "part" if child_type == "part" else "component"
        
        item_dict = {
            "id": item.id,
            "childType": child_type_local,          # 本地格式字段
            "child_type": child_type,               # 保留原字段（兼容性）
            "child_id": item.child_id,              # 保留原字段（兼容性）
            "quantity": float(item.quantity),
            "created_at": item.created_at
        }
        # 根据类型设置 componentId 或 partId（本地格式核心字段）
        if child_type != "part":  # assembly 或 component 都视为部件
            item_dict["componentId"] = item.child_id
            item_dict["partId"] = None
        else:  # part
            item_dict["componentId"] = None
            item_dict["partId"] = item.child_id
        
        # 获取子项详细信息
        if child_type == "part":
            child = get_part(db, item.child_id)
            if child:
                item_dict["child_detail"] = {
                    "id": child.id,
                    "code": child.code,
                    "name": child.name,
                    "spec": child.spec
                }
        elif child_type != "part":  # assembly 或 component 都视为部件
            child = get_assembly(db, item.child_id)
            if child:
                item_dict["child_detail"] = {
                    "id": child.id,
                    "code": child.code,
                    "name": child.name,
                    "spec": child.spec
                }
        result.append(item_dict)
    return result

def get_bom_items(db, parent_type, parent_id):
    return db.query(models.BOMItem).filter(
        models.BOMItem.parent_type == parent_type,
        models.BOMItem.parent_id == parent_id
    ).all()

def create_bom_item(db, item):
    db_item = models.BOMItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_bom_item(db, item_id):
    db_item = db.query(models.BOMItem).filter(models.BOMItem.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item

def create_log(db, user_id, username, action, target_type=None, target_id=None, detail=None, ip_address=None):
    db_log = models.OperationLog(
        user_id=user_id, username=username, action=action,
        target_type=target_type, target_id=target_id,
        detail=detail, ip_address=ip_address
    )
    db.add(db_log)
    db.commit()
    return db_log

def get_logs(db, skip=0, limit=100):
    return db.query(models.OperationLog).order_by(models.OperationLog.created_at.desc()).offset(skip).limit(limit).all()

# Dictionary CRUD
def get_dictionary_items(db, dict_type: str, skip=0, limit=100):
    return db.query(models.Dictionary).filter(models.Dictionary.dict_type == dict_type).offset(skip).limit(limit).all()

def get_dictionary_by_value(db, dict_type: str, value: str):
    return db.query(models.Dictionary).filter(
        models.Dictionary.dict_type == dict_type,
        models.Dictionary.value == value
    ).first()

def create_dictionary(db, dict_type: str, value: str):
    db_dict = models.Dictionary(dict_type=dict_type, value=value)
    db.add(db_dict)
    db.commit()
    db.refresh(db_dict)
    return db_dict

def update_dictionary(db, dict_id, value: str):
    db_dict = db.query(models.Dictionary).filter(models.Dictionary.id == dict_id).first()
    if not db_dict:
        return None
    db_dict.value = value
    from datetime import datetime
    db_dict.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_dict)
    return db_dict

def delete_dictionary(db, dict_id):
    db_dict = db.query(models.Dictionary).filter(models.Dictionary.id == dict_id).first()
    if db_dict:
        db.delete(db_dict)
        db.commit()
    return db_dict
