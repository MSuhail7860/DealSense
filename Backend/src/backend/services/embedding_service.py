import cohere

from backend.core.config import settings


def get_cohere_client() -> cohere.ClientV2:
    if not settings.cohere_api_key:
        raise RuntimeError("COHERE_API_KEY is not configured")

    return cohere.ClientV2(api_key=settings.cohere_api_key)


def generate_embedding(
    text: str,
    input_type: str = "search_document",
) -> list[float]:
    client = get_cohere_client()

    response = client.embed(
        model=settings.cohere_embed_model,
        texts=[text],
        input_type=input_type,
        embedding_types=["float"],
        output_dimension=settings.cohere_embed_dimension,
    )

    return response.embeddings.float[0]