from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean, func
from sqlalchemy.orm import relationship
from core.database import Base

class AIScheduledInterview(Base):
    __tablename__ = 'ai_scheduled_interviews'

    id = Column(Integer, primary_key=True, index=True)
    interviewer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(10), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    deadline = Column(DateTime, nullable=True)
    company_name = Column(String(200), default='')
    selected_tracks = Column(JSON, default=list)
    selected_subcategories = Column(JSON, default=dict)
    status = Column(String(20), default='scheduled')
    recording_url = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=func.now())

    interviewer = relationship("User", foreign_keys=[interviewer_id], lazy="selectin")
    student = relationship("User", foreign_keys=[student_id], lazy="selectin")
    report = relationship("AIInterviewReport", back_populates="interview", uselist=False, lazy="selectin")
    questions = relationship("AIInterviewQuestion", back_populates="interview", cascade="all, delete-orphan", lazy="selectin")

class AIInterviewQuestion(Base):
    __tablename__ = 'ai_interview_questions'

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey('ai_scheduled_interviews.id', ondelete='CASCADE'), nullable=False)
    question_text = Column(Text, nullable=False)
    difficulty_level = Column(String(10), nullable=False)
    question_type = Column(String(20), nullable=False)
    order = Column(Integer, nullable=False)

    interview = relationship("AIScheduledInterview", back_populates="questions")
    answer = relationship("AIInterviewAnswer", back_populates="question", uselist=False, lazy="selectin")

class AIInterviewAnswer(Base):
    __tablename__ = 'ai_interview_answers'

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey('ai_interview_questions.id', ondelete='CASCADE'), nullable=False, unique=True)
    text_answer = Column(Text, nullable=True)
    code_answer = Column(Text, nullable=True)
    language = Column(String(30), nullable=True)
    execution_result = Column(JSON, nullable=True)
    submitted_at = Column(DateTime, default=func.now())

    question = relationship("AIInterviewQuestion", back_populates="answer")

class AIInterviewReport(Base):
    __tablename__ = 'ai_interview_reports'

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey('ai_scheduled_interviews.id', ondelete='CASCADE'), nullable=False, unique=True)
    total_score = Column(Integer, nullable=False)
    communication = Column(Integer, nullable=False)
    technical_depth = Column(Integer, nullable=False)
    code_quality = Column(Integer, nullable=False)
    optimization = Column(Integer, nullable=False)
    problem_solving = Column(Integer, nullable=False)
    warning_count = Column(Integer, default=0)
    disqualified = Column(Boolean, default=False)
    disqualify_reason = Column(String(200), default='')
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    improvement_plan = Column(JSON, default=list)
    recommended_topics = Column(JSON, default=list)
    hiring_signal = Column(String(20), nullable=False)
    skill_gap_analysis = Column(JSON, default=dict)
    raw_ai_response = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=func.now())

    interview = relationship("AIScheduledInterview", back_populates="report")
