import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class CopilotSuggestion(Base):
    __tablename__ = "copilot_suggestions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    deal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.id"),
        nullable=False,
    )

    prompt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    retrieved_context_ids: Mapped[list[str] | None] = mapped_column(
        ARRAY(String),
        nullable=True,
    )

    suggestion: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    accepted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )