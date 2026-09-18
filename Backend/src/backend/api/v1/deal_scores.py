from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.deal import Deal
from backend.models.deal_score import DealScore
from backend.models.user import User
from backend.schemas.deal_score import DealScoreResponse
from backend.services.deal_score_service import calculate_and_save_deal_score

router = APIRouter(
    prefix="/deals/{deal_id}/score",
    tags=["Deal Scores"],
)


def deal_score_response(score: DealScore) -> DealScoreResponse:
    return DealScoreResponse(
        id=str(score.id),
        deal_id=str(score.deal_id),
        win_probability=score.win_probability,
        churn_risk=score.churn_risk,
        model_version=score.model_version,
        computed_at=score.computed_at,
    )

@router.post("", response_model=DealScoreResponse, status_code=status.HTTP_201_CREATED)
async def generate_deal_score(
    deal_id: UUID,
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

    try:
        score = await calculate_and_save_deal_score(deal, db)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return deal_score_response(score)


@router.get("", response_model=DealScoreResponse)
async def get_deal_score(
    deal_id: UUID,
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

    score_result = await db.execute(
        select(DealScore)
        .where(DealScore.deal_id == deal_id)
        .order_by(DealScore.computed_at.desc())
    )

    score = score_result.scalars().first()

    if score is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal score not found",
        )

    return deal_score_response(score)