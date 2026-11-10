from pydantic import BaseModel
from typing import Optional, List

class JobPosting(BaseModel):
    id: str
    title: str
    company_name: str
    location: str
    remote: bool = True
    url: str
    tags: List[str] = []
    track: str = "fullstack"
    created_at: Optional[int] = None

class JobPulseResponse(BaseModel):
    total_jobs: int
    updated_at: float
    source: str = "Arbeitnow Real-Time Feed"
    cached: bool = False
    jobs: List[JobPosting]

