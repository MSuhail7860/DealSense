from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.interaction import Interaction
from backend.services.embedding_service import generate_embedding


async def retrieve_similar_interactions(
    deal_id: UUID,
    query: str,
    db: AsyncSession,
    top_k: int = 5,
) -> list[Interaction]:
    query_embedding = generate_embedding(
        query,
        input_type="search_query",
    )

    distance = Interaction.embedding.cosine_distance(query_embedding)

    result = await db.execute(
        select(Interaction)
        .where(
            Interaction.deal_id == deal_id,
            Interaction.embedding.is_not(None),
        )
        .order_by(distance)
        .limit(top_k)
    )

    return list(result.scalars().all())