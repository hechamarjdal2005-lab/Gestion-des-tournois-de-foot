from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # نص عادي، ليس Enum

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str