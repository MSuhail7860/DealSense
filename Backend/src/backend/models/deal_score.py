import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class DealScore(Base):
    __tablename__ = "deal_scores"

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

    win_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    churn_risk: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    model_version: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )