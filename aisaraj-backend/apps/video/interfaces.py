"""Abstract VideoProvider interface for vendor-agnostic video calling."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class VideoCallInfo:
    call_id: str
    provider: str
    join_url: Optional[str] = None
    recording_url: Optional[str] = None


class VideoProvider(ABC):
    @abstractmethod
    def create_call(self, call_id: str, participants: list) -> VideoCallInfo:
        """Create a new video call room."""

    @abstractmethod
    def generate_user_token(self, user_id: str, call_id: str) -> str:
        """Generate auth token for a participant."""

    @abstractmethod
    def end_call(self, call_id: str) -> None:
        """End an active call."""

    @abstractmethod
    def get_recording_url(self, call_id: str) -> Optional[str]:
        """Retrieve recording URL after call ends."""
