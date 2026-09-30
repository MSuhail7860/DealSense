import cohere

from backend.core.config import settings


def get_cohere_client() -> cohere.ClientV2:
    if not settings.cohere_api_key:
        raise RuntimeError("COHERE_API_KEY is not configured")

    return cohere.ClientV2(api_key=settings.cohere_api_key)


def generate_response(prompt: str) -> str:
    client = get_cohere_client()

    response = client.chat(
        model=settings.cohere_chat_model,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    return response.message.content[0].text