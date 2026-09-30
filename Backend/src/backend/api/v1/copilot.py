from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.copilot_suggestion import CopilotSuggestion
from backend.models.deal import Deal
from backend.models.user import User
from backend.schemas.copilot import CopilotRequest, CopilotResponse
from backend.services.copilot_service import generate_copilot_suggestion


router = APIRouter(
    prefix="/deals/{deal_id}/copilot",
    tags=["Copilot"],
)


@router.post(
    "/suggest",
    response_model=CopilotResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_copilot_suggestion(
    deal_id: UUID,
    data: CopilotRequest,
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

    suggestion = await generate_copilot_suggestion(
        deal=deal,
        prompt=data.prompt,
        db=db,
    )

    return CopilotResponse(
        id=str(suggestion.id),
        deal_id=str(suggestion.deal_id),
        prompt=suggestion.prompt,
        retrieved_context_ids=suggestion.retrieved_context_ids,
        suggestion=suggestion.suggestion,
        accepted=suggestion.accepted,
        created_at=suggestion.created_at,
    )


@router.patch(
    "/suggestions/{suggestion_id}/accept",
    response_model=CopilotResponse,
)
async def accept_copilot_suggestion(
    deal_id: UUID,
    suggestion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
        select(CopilotSuggestion).where(
            CopilotSuggestion.id == suggestion_id,
            CopilotSuggestion.deal_id == deal_id,
        )
    )

    suggestion = result.scalar_one_or_none()

    if suggestion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Copilot suggestion not found",
        )

    suggestion.accepted = True

    await db.commit()
    await db.refresh(suggestion)

    return CopilotResponse(
        id=str(suggestion.id),
        deal_id=str(suggestion.deal_id),
        prompt=suggestion.prompt,
        retrieved_context_ids=suggestion.retrieved_context_ids,
        suggestion=suggestion.suggestion,
        accepted=suggestion.accepted,
        created_at=suggestion.created_at,
    )