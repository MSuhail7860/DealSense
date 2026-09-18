from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.deal import Deal
from backend.models.interaction import Interaction


async def calculate_deal_features(
    deal: Deal,
    db: AsyncSession,
) -> dict:
    result = await db.execute(
        select(Interaction)
        .where(Interaction.deal_id == deal.id)
        .order_by(Interaction.created_at.asc())
    )

    interactions = result.scalars().all()

    now = datetime.now(timezone.utc)

    # 1. Deal value
    deal_value = float(deal.value)

    # 2. Stage
    stage = deal.stage

    # 3. Days in stage
    days_in_stage = (now - deal.created_at).days

    # 4. Number of interactions
    num_interactions = len(interactions)

    # 5. Average response time
    response_times = [
        interaction.response_time_minutes
        for interaction in interactions
        if interaction.response_time_minutes is not None
    ]

    avg_response_min = (
        sum(response_times) / len(response_times)
        if response_times
        else 0.0
    )

    # 6. Days since last interaction
    if interactions:
        last_interaction = interactions[-1]
        days_since_last = (now - last_interaction.created_at).days
    else:
        days_since_last = 0

    # 7. Sentiment trend
    sentiments = [
        interaction.sentiment_score
        for interaction in interactions
        if interaction.sentiment_score is not None
    ]

    if len(sentiments) >= 2:
        sentiment_trend = sentiments[-1] - sentiments[0]
    else:
        sentiment_trend = 0.0

    return {
        "deal_value": deal_value,
        "stage": stage,
        "days_in_stage": days_in_stage,
        "num_interactions": num_interactions,
        "avg_response_min": avg_response_min,
        "days_since_last": days_since_last,
        "sentiment_trend": sentiment_trend,
    }