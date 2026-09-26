import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator

from app.auth.dependencies import Caller, get_caller, is_admin_email
from app.auth.utils import hash_password, verify_password
from app.services import accounts_store, deepgram_sync

logger = logging.getLogger(__name__)

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
    email: str
    status: str
    is_admin: bool


class MeResponse(BaseModel):
    email: str
    status: str
    is_admin: bool


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    if accounts_store.email_exists(request.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    admin = is_admin_email(request.email)
    status = "approved" if admin else "pending"
    try:
        account = accounts_store.create_account(request.email, hash_password(request.password), status)
    except Exception:
        logger.exception("Registration failed")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")
    if admin:
        deepgram_sync.grant(account["project_id"])
    message = "Account created successfully!" if admin else "Account created. The admin will approve it soon."
    return AuthResponse(api_key=account["api_key"], message=message, email=request.email, status=status, is_admin=admin)


@router.post("/login", response_model=AuthResponse)
def login(request: RegisterRequest):
    user = accounts_store.find_login_user(request.email)
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    admin = is_admin_email(user["email"])
    status = "approved" if admin else (user["status"] or "pending")
    if status == "disabled":
        raise HTTPException(status_code=403, detail="Your account has been disabled.")
    try:
        api_key = accounts_store.rotate_api_key(user["project_id"])
    except Exception:
        logger.exception("Login failed")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
    return AuthResponse(api_key=api_key, message="Login successful!", email=user["email"], status=status, is_admin=admin)


@router.get("/me", response_model=MeResponse)
def me(caller: Caller = Depends(get_caller)):
    return MeResponse(email=caller.email, status=caller.status, is_admin=caller.is_admin)