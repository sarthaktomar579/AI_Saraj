from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from schemas.ai_interview import AIInterviewDetailResponse
from schemas.practice import SessionDetailResponse
from schemas.interview import InterviewResponse
from schemas.user import User as UserSchema

class DashboardStats(BaseModel):
    total_interviews: int
    practice_count: int
    ai_interview_count: int
    completed_ai_count: int
    average_score: Optional[float] = 0.0

class DashboardSummaryResponse(BaseModel):
    stats: DashboardStats
    recent_interviews: List[InterviewResponse] = []
    ai_interviews: List[AIInterviewDetailResponse] = []
    practice_sessions: List[SessionDetailResponse] = []
    students: Optional[List[UserSchema]] = None

