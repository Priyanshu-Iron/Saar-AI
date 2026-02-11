import hashlib
import secrets
import bcrypt

def generate_api_key() -> str:
    """Generate a random 32-character API key."""
    return secrets.token_urlsafe(32)

def hash_api_key(api_key: str) -> str:
    """Hash API key with SHA-256 (matches Attendee's format)."""
    return hashlib.sha256(api_key.encode()).hexdigest()

def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())