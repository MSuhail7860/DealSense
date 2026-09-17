from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.contact import Contact
from backend.models.deal import Deal
from backend.models.user import User
from backend.schemas.deal import (
    DealCreate,
    DealResponse,
    DealUpdate,
)


router = APIRouter(
    prefix="/deals",
    tags=["Deals"],
)


def deal_response(deal: Deal) -> DealResponse:
    return DealResponse(
        id=str(deal.id),
        contact_id=str(deal.contact_id),
        owner_id=str(deal.owner_id),
        stage=deal.stage,
        value=deal.value,
        created_at=deal.created_at,
        closed_at=deal.closed_at,
    )


@router.post(
    "",
    response_model=DealResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_deal(
    data: DealCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check that the contact exists and belongs to the current user
    result = await db.execute(
        select(Contact).where(
            Contact.id == UUID(data.contact_id),
            Contact.owner_id == current_user.id,
        )
    )

    contact = result.scalar_one_or_none()

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    deal = Deal(
        contact_id=contact.id,
        owner_id=current_user.id,
        stage=data.stage,
        value=data.value,
    )

    db.add(deal)

    await db.commit()
    await db.refresh(deal)

    return deal_response(deal)


@router.get(
    "",
    response_model=list[DealResponse],
)
async def get_deals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deal)
        .where(Deal.owner_id == current_user.id)
        .order_by(Deal.created_at.desc())
    )

    deals = result.scalars().all()

    return [deal_response(deal) for deal in deals]


@router.get(
    "/{deal_id}",
    response_model=DealResponse,
)
async def get_deal(
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deal).where(
            Deal.id == deal_id,
            Deal.owner_id == current_user.id,
        )
    )

    deal = result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    return deal_response(deal)


@router.patch(
    "/{deal_id}",
    response_model=DealResponse,
)
async def update_deal(
    deal_id: UUID,
    data: DealUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deal).where(
            Deal.id == deal_id,
            Deal.owner_id == current_user.id,
        )
    )

    deal = result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    update_data = data.model_dump(exclude_unset=True)

    if "contact_id" in update_data:
        contact_result = await db.execute(
            select(Contact).where(
                Contact.id == UUID(update_data["contact_id"]),
                Contact.owner_id == current_user.id,
            )
        )

        contact = contact_result.scalar_one_or_none()

        if contact is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found",
            )

        deal.contact_id = contact.id

    if "stage" in update_data:
        deal.stage = update_data["stage"]

    if "value" in update_data:
        deal.value = update_data["value"]

    if "closed_at" in update_data:
        deal.closed_at = update_data["closed_at"]

    await db.commit()
    await db.refresh(deal)

    return deal_response(deal)


@router.delete(
    "/{deal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_deal(
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deal).where(
            Deal.id == deal_id,
            Deal.owner_id == current_user.id,
        )
    )

    deal = result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    await db.delete(deal)
    await db.commit()