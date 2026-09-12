from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.contact import Contact
from backend.models.user import User
from backend.schemas.contact import ContactCreate, ContactResponse


router = APIRouter(
    prefix="/contacts",
    tags=["Contacts"],
)


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_contact(
    data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = Contact(
        owner_id=current_user.id,
        name=data.name,
        company=data.company,
        email=data.email,
        phone=data.phone,
    )

    db.add(contact)

    await db.commit()
    await db.refresh(contact)

    return ContactResponse(
        id=str(contact.id),
        name=contact.name,
        company=contact.company,
        email=contact.email,
        phone=contact.phone,
        owner_id=str(contact.owner_id),
        created_at=contact.created_at,
    )