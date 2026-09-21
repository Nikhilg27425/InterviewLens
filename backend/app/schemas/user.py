import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.interviewer
    company: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class CandidateCreate(BaseModel):
    """Simplified registration for candidates (created by interviewer or via invite)."""
    email: EmailStr
    full_name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class CandidateLogin(BaseModel):
    """Candidates log in with email + session access token (no password)."""
    email: EmailStr
    access_token: str   # the session invite token


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: str
    full_name: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    company: str | None
    is_active: bool
    created_at: datetime
    oauth_provider: str | None = None
    profile_picture: str | None = None

    model_config = {"from_attributes": True}
