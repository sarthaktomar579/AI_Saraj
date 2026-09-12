from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SessionCreate(BaseModel):
    topic: str
    difficulty: str
    selected_tracks: List[str]
    selected_subcategories: Optional[Dict[str, List[str]]] = {}
    session_type: Optional[str] = 'practice'
    scheduled_interview_id: Optional[int] = None

class AIQuestionResponse(BaseModel):
    id: int
    question_text: str
    difficulty_level: str
    question_type: str
    order: int
    
    model_config = {"from_attributes": True}

class SessionDetailResponse(BaseModel):
    id: int
    student_id: int
    topic: str
    difficulty: str
    selected_tracks: Optional[List[str]] = []
    selected_subcategories: Optional[Dict[str, List[str]]] = {}
    session_type: Optional[str] = 'practice'
    scheduled_interview_id: Optional[int] = None
    status: str
    current_q_index: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    questions: Optional[List[AIQuestionResponse]] = []
    evaluation: Optional['PracticeEvaluationResponse'] = None

    model_config = {"from_attributes": True}

class StartQuestionsResponse(BaseModel):
    message: str
    questions: List[AIQuestionResponse] = []

class AnswerSubmit(BaseModel):
    question_id: int
    text_answer: Optional[str] = ''
    code_answer: Optional[str] = ''
    language: Optional[str] = ''

class PracticeEvaluationResponse(BaseModel):
    id: Optional[int] = None
    total_score: int
    communication: int
    technical_depth: int
    code_quality: int
    optimization: int
    problem_solving: int
    strengths: Optional[List[str]] = []
    weaknesses: Optional[List[str]] = []
    improvement_plan: Optional[List[str]] = []
    recommended_topics: Optional[List[str]] = []
    hiring_signal: str
    raw_ai_response: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

class EvaluateRequest(BaseModel):
    code_explanation: Optional[str] = ''
    warning_count: Optional[int] = 0
    disqualified: Optional[bool] = False
    disqualify_reason: Optional[str] = ''

