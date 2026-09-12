from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship
from core.database import Base

class Interview(Base):
    __tablename__ = 'interviews'

    id = Column(Integer, primary_key=True, index=True)
    interviewer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration_min = Column(Integer, default=60)
    status = Column(String(20), default='scheduled')
    video_call_id = Column(String(255), nullable=True)
    recording_url = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=func.now())

    interviewer = relationship("User", foreign_keys=[interviewer_id], lazy="selectin")
    student = relationship("User", foreign_keys=[student_id], lazy="selectin")
    feedback = relationship("InterviewFeedback", back_populates="interview", uselist=False, lazy="selectin")
    code_submissions = relationship("CodeSubmission", back_populates="interview", cascade="all, delete-orphan", lazy="selectin")

class InterviewFeedback(Base):
    __tablename__ = 'interview_feedback'

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey('interviews.id', ondelete='CASCADE'), nullable=False, unique=True)
    score = Column(Integer, nullable=False)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    interview = relationship("Interview", back_populates="feedback")

class CodeSubmission(Base):
    __tablename__ = 'code_submissions'

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey('interviews.id', ondelete='CASCADE'), nullable=False)
    language = Column(String(30), nullable=False)
    source_code = Column(Text, nullable=False)
    stdin = Column(Text, nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    executed_at = Column(DateTime, default=func.now())

    interview = relationship("Interview", back_populates="code_submissions")
