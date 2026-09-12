from backend.models.contact import Contact
from backend.models.copilot_suggestion import CopilotSuggestion
from backend.models.deal import Deal
from backend.models.deal_score import DealScore
from backend.models.interaction import Interaction
from backend.models.user import User

__all__ = [
    "User",
    "Contact",
    "Deal",
    "Interaction",
    "DealScore",
    "CopilotSuggestion",
]