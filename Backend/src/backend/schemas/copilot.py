from datetime import datetime

from pydantic import BaseModel


class CopilotRequest(BaseModel):
    prompt: str


class CopilotResponse(BaseModel):
    id: str
    deal_id: str
    prompt: str
    retrieved_context_ids: list[str] | None
    suggestion: str
    accepted: bool
    created_at: datetime