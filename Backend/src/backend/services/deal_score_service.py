from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.deal import Deal
from backend.models.deal_score import DealScore
from backend.services.deal_features import calculate_deal_features
from backend.services.ml_client import predict_deal_score


async def calculate_and_save_deal_score(
    deal: Deal,
    db: AsyncSession,
) -> DealScore:
    # Calculate the features required by the ML service.
    features = await calculate_deal_features(deal, db)

    # Ask the ML service for the prediction.
    prediction = await predict_deal_score(features)

    # Create a new score record.
    score = DealScore(
        deal_id=deal.id,
        win_probability=prediction["win_probability"],
        churn_risk=prediction["churn_risk"],
        model_version=prediction["model_version"],
    )

    db.add(score)
    await db.commit()
    await db.refresh(score)

    return score