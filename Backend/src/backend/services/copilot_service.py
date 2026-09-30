from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.copilot_suggestion import CopilotSuggestion
from backend.models.deal import Deal
from backend.models.deal_score import DealScore
from backend.services.generation_service import generate_response
from backend.services.rag_service import retrieve_similar_interactions


async def generate_copilot_suggestion(
    deal: Deal,
    prompt: str,
    db: AsyncSession,
) -> CopilotSuggestion:
    # Retrieve relevant past interactions for this deal
    interactions = await retrieve_similar_interactions(
        deal_id=deal.id,
        query=prompt,
        db=db,
        top_k=5,
    )

    # Get the latest ML score for this deal
    score_result = await db.execute(
        select(DealScore)
        .where(DealScore.deal_id == deal.id)
        .order_by(DealScore.computed_at.desc())
        .limit(1)
    )

    latest_score = score_result.scalar_one_or_none()

    # Build context from retrieved interactions
    context_parts = []

    for interaction in interactions:
        context_parts.append(
            f"""
Interaction type: {interaction.type}
Date: {interaction.created_at}
Content: {interaction.content}
Sentiment: {interaction.sentiment_score}
Response time: {interaction.response_time_minutes} minutes
""".strip()
        )

    context = "\n\n---\n\n".join(context_parts)

    # Build deal score context
    if latest_score:
        score_context = f"""
- Win probability: {latest_score.win_probability}
- Churn risk: {latest_score.churn_risk}
- Model version: {latest_score.model_version}
""".strip()
    else:
        score_context = "No ML deal score is currently available."

    # Build the prompt sent to Cohere
    copilot_prompt = f"""
You are an AI sales copilot for DealSense.

Deal information:
- Deal ID: {deal.id}
- Stage: {deal.stage}
- Value: {deal.value}

Latest ML deal score:
{score_context}

Relevant interaction history:
{context if context else "No relevant interaction history was found."}

User request:
{prompt}

Instructions:
- Use only facts explicitly provided in the deal information, ML score, and interaction history.
- Do not assume anything about the customer, prospect, their intentions, or their responses.
- If the available context is insufficient, clearly say that more information is needed.
- Do not invent events, customer needs, feedback, conversations, or outcomes.
- Use the ML score as supporting information, not as a certainty.
- Give practical and concise guidance based only on the available evidence.
""".strip()

    # Generate the Copilot response
    suggestion_text = generate_response(copilot_prompt)

    # Save the generated suggestion
    suggestion = CopilotSuggestion(
        deal_id=deal.id,
        prompt=prompt,
        retrieved_context_ids=[
            str(interaction.id)
            for interaction in interactions
        ],
        suggestion=suggestion_text,
    )

    db.add(suggestion)
    await db.commit()
    await db.refresh(suggestion)

    return suggestion