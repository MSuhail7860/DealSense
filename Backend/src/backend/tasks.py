import asyncio
from uuid import UUID

from sqlalchemy import select

from backend.core.database import AsyncSessionLocal
from backend.models.deal import Deal
from backend.models.interaction import Interaction
from backend.services.deal_score_service import calculate_and_save_deal_score
from backend.worker import celery_app


@celery_app.task
def process_interaction(interaction_id: str):
    return asyncio.run(_process_interaction(interaction_id))


async def _process_interaction(interaction_id: str):
    async with AsyncSessionLocal() as db:
        interaction_result = await db.execute(
            select(Interaction).where(
                Interaction.id == UUID(interaction_id)
            )
        )

        interaction = interaction_result.scalar_one_or_none()

        if interaction is None:
            raise ValueError(f"Interaction {interaction_id} not found")

        deal_result = await db.execute(
            select(Deal).where(
                Deal.id == interaction.deal_id
            )
        )

        deal = deal_result.scalar_one_or_none()

        if deal is None:
            raise ValueError(
                f"Deal {interaction.deal_id} not found"
            )

        score = await calculate_and_save_deal_score(
            deal,
            db,
        )

        return {
            "interaction_id": interaction_id,
            "deal_id": str(deal.id),
            "score_id": str(score.id),
            "win_probability": score.win_probability,
            "churn_risk": score.churn_risk,
            "model_version": score.model_version,
        }