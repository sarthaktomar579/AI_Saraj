from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class InterviewBase(BaseModel):
    title: str
    description: Optional[str] = ''
    scheduled_at: datetime
    duration_min: Optional[int] = 60

class InterviewCreate(InterviewBase):
    student_id: int

class InterviewResponse(InterviewBase):
    id: int
    interviewer_id: int
    student_id: int
    status: str
    video_call_id: Optional[str] = None
    recording_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class FeedbackCreate(BaseModel):
    score: int
    strengths: List[str]
    weaknesses: List[str]
    notes: Optional[str] = ''

class FeedbackResponse(FeedbackCreate):
    id: int
    interview_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class CodeSubmissionCreate(BaseModel):
    language: str
    source_code: str
    stdin: Optional[str] = ''

class CodeSubmissionResponse(CodeSubmissionCreate):
    id: int
    interview_id: int
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None
    executed_at: datetime

    model_config = {"from_attributes": True}
