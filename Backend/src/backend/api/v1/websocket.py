from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.core.redis import redis_client


router = APIRouter(
    tags=["WebSocket"],
)


@router.websocket("/ws/scores")
async def score_websocket(websocket: WebSocket):
    await websocket.accept()

    pubsub = redis_client.pubsub()
    await pubsub.subscribe("deal_scores")

    try:
        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1,
            )

            if message is not None:
                await websocket.send_text(message["data"])

    except WebSocketDisconnect:
        pass

    finally:
        await pubsub.aclose()