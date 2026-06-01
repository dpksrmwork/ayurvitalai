from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(..., description="doctor, patient, or admin")
    full_name: str = Field(..., min_length=1)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserMeResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    full_name: str
    doctor_profile_id: Optional[int] = None
    is_verified: Optional[bool] = None

    class Config:
        from_attributes = True
