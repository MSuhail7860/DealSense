from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.contact import Contact
from backend.models.user import User
from backend.schemas.contact import (
    ContactCreate,
    ContactResponse,
    ContactUpdate,
)


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


@router.get(
    "",
    response_model=list[ContactResponse],
)
async def get_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact)
        .where(Contact.owner_id == current_user.id)
        .order_by(Contact.created_at.desc())
    )

    contacts = result.scalars().all()

    return [
        ContactResponse(
            id=str(contact.id),
            name=contact.name,
            company=contact.company,
            email=contact.email,
            phone=contact.phone,
            owner_id=str(contact.owner_id),
            created_at=contact.created_at,
        )
        for contact in contacts
    ]


@router.get(
    "/{contact_id}",
    response_model=ContactResponse,
)
async def get_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    )

    contact = result.scalar_one_or_none()

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    return ContactResponse(
        id=str(contact.id),
        name=contact.name,
        company=contact.company,
        email=contact.email,
        phone=contact.phone,
        owner_id=str(contact.owner_id),
        created_at=contact.created_at,
    )


@router.patch(
    "/{contact_id}",
    response_model=ContactResponse,
)
async def update_contact(
    contact_id: UUID,
    data: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    )

    contact = result.scalar_one_or_none()

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(contact, field, value)

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


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    )

    contact = result.scalar_one_or_none()

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    await db.delete(contact)
    await db.commit()

    return None