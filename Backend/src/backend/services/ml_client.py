import httpx


ML_SERVICE_URL = "http://localhost:8001"


async def predict_deal_score(features: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{ML_SERVICE_URL}/predict",
                json=features,
            )

            response.raise_for_status()

            return response.json()

    except httpx.ConnectError as exc:
        raise RuntimeError(
            "ML service is unavailable. Make sure the ML service is running on port 8001."
        ) from exc

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "ML service request timed out."
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"ML service returned HTTP {exc.response.status_code}."
        ) from exc