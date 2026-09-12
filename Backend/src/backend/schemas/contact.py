from datetime import datetime

from pydantic import BaseModel, EmailStr


class ContactCreate(BaseModel):
    name: str
    company: str
    email: EmailStr
    phone: str | None = None


class ContactResponse(BaseModel):
    id: str
    name: str
    company: str
    email: EmailStr
    phone: str | None
    owner_id: str
    created_at: datetime