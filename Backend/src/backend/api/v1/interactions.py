from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.deal import Deal
from backend.models.interaction import Interaction
from backend.models.user import User
from backend.schemas.interaction import (
    InteractionCreate,
    InteractionResponse,
)


router = APIRouter(
    prefix="/deals/{deal_id}/interactions",
    tags=["Interactions"],
)


def interaction_response(interaction: Interaction) -> InteractionResponse:
    return InteractionResponse(
        id=str(interaction.id),
        deal_id=str(interaction.deal_id),
        type=interaction.type,
        content=interaction.content,
        sentiment_score=interaction.sentiment_score,
        response_time_minutes=interaction.response_time_minutes,
        created_at=interaction.created_at,
    )


@router.post(
    "",
    response_model=InteractionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_interaction(
    deal_id: UUID,
    data: InteractionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check that the deal exists and belongs to the current user
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

    interaction = Interaction(
        deal_id=deal.id,
        type=data.type,
        content=data.content,
        sentiment_score=data.sentiment_score,
        response_time_minutes=data.response_time_minutes,
    )

    db.add(interaction)

    await db.commit()
    await db.refresh(interaction)

    return interaction_response(interaction)


@router.get(
    "",
    response_model=list[InteractionResponse],
)
async def get_interactions(
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check that the deal exists and belongs to the current user
    deal_result = await db.execute(
        select(Deal).where(
            Deal.id == deal_id,
            Deal.owner_id == current_user.id,
        )
    )

    deal = deal_result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    result = await db.execute(
        select(Interaction)
        .where(Interaction.deal_id == deal_id)
        .order_by(Interaction.created_at.desc())
    )

    interactions = result.scalars().all()

    return [interaction_response(interaction) for interaction in interactions]