from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AIInterviewCreate(BaseModel):
    student_id: int
    topic: str
    difficulty: str
    scheduled_at: datetime
    deadline: Optional[datetime] = None
    company_name: Optional[str] = ''
    selected_tracks: Optional[List[str]] = []
    selected_subcategories: Optional[Dict[str, List[str]]] = {}

class AIInterviewQuestionResponse(BaseModel):
    id: int
    question_text: str
    difficulty_level: str
    question_type: str
    order: int
    
    model_config = {"from_attributes": True}

class AIInterviewReportResponse(BaseModel):
    id: Optional[int] = None
    interview_id: Optional[int] = None
    total_score: int
    communication: int
    technical_depth: int
    code_quality: int
    optimization: int
    problem_solving: int
    warning_count: Optional[int] = 0
    disqualified: Optional[bool] = False
    disqualify_reason: Optional[str] = ''
    strengths: Optional[List[str]] = []
    weaknesses: Optional[List[str]] = []
    improvement_plan: Optional[List[str]] = []
    recommended_topics: Optional[List[str]] = []
    hiring_signal: str
    skill_gap_analysis: Optional[Dict[str, Any]] = {}
    raw_ai_response: Optional[Dict[str, Any]] = {}
    created_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

class AIInterviewDetailResponse(BaseModel):
    id: int
    student_id: int
    interviewer_id: int
    topic: str
    difficulty: str
    scheduled_at: datetime
    deadline: Optional[datetime] = None
    company_name: Optional[str] = ''
    selected_tracks: Optional[List[str]] = []
    selected_subcategories: Optional[Dict[str, List[str]]] = {}
    status: str
    recording_url: Optional[str] = None
    created_at: datetime
    questions: Optional[List[AIInterviewQuestionResponse]] = []
    report: Optional[AIInterviewReportResponse] = None

class AIAnswerSubmit(BaseModel):
    question_id: int
    text_answer: Optional[str] = ''
    code_answer: Optional[str] = ''
    language: Optional[str] = ''

class AIInterviewReportCreate(BaseModel):
    total_score: Optional[int] = 0
    communication: Optional[int] = 0
    technical_depth: Optional[int] = 0
    code_quality: Optional[int] = 0
    optimization: Optional[int] = 0
    problem_solving: Optional[int] = 0
    warning_count: Optional[int] = 0
    disqualified: Optional[bool] = False
    disqualify_reason: Optional[str] = ''
    strengths: Optional[List[str]] = []
    weaknesses: Optional[List[str]] = []
    improvement_plan: Optional[List[str]] = []
    recommended_topics: Optional[List[str]] = []
    hiring_signal: Optional[str] = 'uncertain'
    skill_gap_analysis: Optional[Dict[str, Any]] = {}
    raw_ai_response: Optional[Dict[str, Any]] = {}
