import hashlib
import secrets
import string
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import text
from app.db.connection import SessionLocal
from app.auth.utils import hash_password, verify_password, generate_api_key, hash_api_key

router = APIRouter(prefix="/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class AuthResponse(BaseModel):
    api_key: str
    message: str

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    db = SessionLocal()
    try:
        # Check if email exists
        existing = db.execute(
            text("SELECT id FROM accounts_user WHERE email = :email"),
            {"email": request.email}
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # 1. Create Organization
        db.execute(
            text("""INSERT INTO accounts_organization 
                (name, created_at, updated_at, centicredits, version,
                 is_webhooks_enabled, is_async_transcription_enabled, 
                 is_managed_zoom_oauth_enabled, is_app_sessions_enabled,
                 autopay_enabled, autopay_threshold_centricredits, autopay_amount_to_purchase_cents) 
                VALUES (:name, NOW(), NOW(), 500, 0,
                 true, false, true, false,
                 false, 1000, 5000)"""),
            {"name": f"{request.email}'s organization"}
        )
        org_id = db.execute(text("SELECT currval(pg_get_serial_sequence('accounts_organization', 'id'))")).scalar()
        
        # 2. Create Project
        proj_object_id = "proj_" + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
        db.execute(
            text("INSERT INTO bots_project (name, organization_id, object_id, created_at, updated_at) VALUES (:name, :org_id, :obj_id, NOW(), NOW())"),
            {"name": f"{request.email}'s project", "org_id": org_id, "obj_id": proj_object_id}
        )
        project_id = db.execute(text("SELECT currval(pg_get_serial_sequence('bots_project', 'id'))")).scalar()
        
        # 3. Create User
        user_object_id = "usr_" + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
        db.execute(
            text("""INSERT INTO accounts_user 
                (email, password, username, organization_id, object_id, role, 
                 is_active, is_staff, is_superuser, date_joined, first_name, last_name)
                VALUES (:email, :password, :username, :org_id, :obj_id, 'admin', 
                 true, false, false, NOW(), '', '')"""),
            {"email": request.email, "password": hash_password(request.password), 
             "username": str(uuid.uuid4()), "org_id": org_id, "obj_id": user_object_id}
        )
        
        # 4. Create API Key
        api_key = generate_api_key()
        key_object_id = "key_" + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
        db.execute(
            text("""INSERT INTO bots_apikey (name, project_id, key_hash, object_id, created_at, updated_at) 
                VALUES (:name, :project_id, :key_hash, :obj_id, NOW(), NOW())"""),
            {"name": "Default Key", "project_id": project_id, 
             "key_hash": hash_api_key(api_key), "obj_id": key_object_id}
        )
        
        db.commit()
        return AuthResponse(api_key=api_key, message="Account created successfully!")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")
    finally:
        db.close()

@router.post("/login", response_model=AuthResponse)
def login(request: RegisterRequest):
    db = SessionLocal()
    try:
        user = db.execute(
            text("SELECT id, password, organization_id FROM accounts_user WHERE email = :email"),
            {"email": request.email}
        ).mappings().first()
        
        if not user or not verify_password(request.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Get project for this org
        project = db.execute(
            text("SELECT id FROM bots_project WHERE organization_id = :org_id LIMIT 1"),
            {"org_id": user["organization_id"]}
        ).mappings().first()
        
        # Disable old keys and create new one (avoid key accumulation)
        db.execute(
            text("UPDATE bots_apikey SET disabled_at = NOW() WHERE project_id = :pid AND disabled_at IS NULL"),
            {"pid": project["id"]}
        )
        
        # Create new API key
        api_key = generate_api_key()
        key_object_id = "key_" + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
        db.execute(
            text("""INSERT INTO bots_apikey (name, project_id, key_hash, object_id, created_at, updated_at) 
                VALUES (:name, :project_id, :key_hash, :obj_id, NOW(), NOW())"""),
            {"name": "Login Key", "project_id": project["id"],
             "key_hash": hash_api_key(api_key), "obj_id": key_object_id}
        )
        
        db.commit()
        return AuthResponse(api_key=api_key, message="Login successful!")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
    finally:
        db.close()