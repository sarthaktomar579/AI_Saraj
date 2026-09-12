from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship
from core.database import Base

class PracticeSession(Base):
    __tablename__ = 'practice_sessions'

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(10), nullable=False)
    selected_tracks = Column(JSON, default=list)
    selected_subcategories = Column(JSON, default=dict)
    session_type = Column(String(20), default='practice')
    scheduled_interview_id = Column(Integer, nullable=True)
    status = Column(String(20), default='active')
    current_q_index = Column(Integer, default=0)
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)

    student = relationship("User", lazy="selectin")
    evaluation = relationship("PracticeEvaluation", back_populates="session", uselist=False, lazy="selectin")
    questions = relationship("AIQuestion", back_populates="session", cascade="all, delete-orphan", lazy="selectin")

class AIQuestion(Base):
    __tablename__ = 'ai_questions'

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('practice_sessions.id', ondelete='CASCADE'), nullable=False)
    question_text = Column(Text, nullable=False)
    difficulty_level = Column(String(10), nullable=False)
    question_type = Column(String(20), nullable=False)
    order = Column(Integer, nullable=False)

    session = relationship("PracticeSession", back_populates="questions")
    answer = relationship("AIAnswer", back_populates="question", uselist=False, lazy="selectin")

class AIAnswer(Base):
    __tablename__ = 'ai_answers'

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey('ai_questions.id', ondelete='CASCADE'), nullable=False, unique=True)
    text_answer = Column(Text, nullable=True)
    code_answer = Column(Text, nullable=True)
    language = Column(String(30), nullable=True)
    execution_result = Column(JSON, nullable=True)
    submitted_at = Column(DateTime, default=func.now())

    question = relationship("AIQuestion", back_populates="answer")

class PracticeEvaluation(Base):
    __tablename__ = 'practice_evaluations'

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('practice_sessions.id', ondelete='CASCADE'), nullable=False, unique=True)
    total_score = Column(Integer, nullable=False)
    communication = Column(Integer, nullable=False)
    technical_depth = Column(Integer, nullable=False)
    code_quality = Column(Integer, nullable=False)
    optimization = Column(Integer, nullable=False)
    problem_solving = Column(Integer, nullable=False)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    improvement_plan = Column(JSON, default=list)
    recommended_topics = Column(JSON, default=list)
    hiring_signal = Column(String(20), nullable=False)
    raw_ai_response = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=func.now())

    session = relationship("PracticeSession", back_populates="evaluation")
