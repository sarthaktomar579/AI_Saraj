from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List, Any
from core.database import get_db
from api.deps import get_current_user
from models.user import User
from models.interview import Interview, InterviewFeedback
from schemas.interview import InterviewCreate, InterviewResponse, FeedbackCreate, FeedbackResponse, CodeSubmissionCreate, CodeSubmissionResponse
from services.interview_service import interview_service

router = APIRouter()

def check_interviewer_role(current_user: User):
    if current_user.role not in ['interviewer', 'admin']:
        raise HTTPException(status_code=403, detail="Not an interviewer")
    return current_user

@router.post("", response_model=InterviewResponse)
@router.post("/", response_model=InterviewResponse)
async def create_interview(
    request: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    check_interviewer_role(current_user)
    interview = await interview_service.schedule(
        db=db,
        interviewer_id=current_user.id,
        student_id=request.student_id,
        title=request.title,
        scheduled_at=request.scheduled_at.replace(tzinfo=None), # naive datetime for SQLAlchemy
        description=request.description,
        duration_min=request.duration_min
    )
    return interview

@router.get("", response_model=List[InterviewResponse])
@router.get("/", response_model=List[InterviewResponse])
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(Interview).where(
            or_(Interview.interviewer_id == current_user.id, Interview.student_id == current_user.id)
        )
    )
    interviews = result.scalars().all()
    return interviews

@router.get("/{pk}", response_model=InterviewResponse)
@router.get("/{pk}/", response_model=InterviewResponse)
async def get_interview(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Interview).where(Interview.id == pk))
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if current_user.id not in [interview.interviewer_id, interview.student_id]:
        raise HTTPException(status_code=403, detail="Not a participant")
    return interview

@router.post("/{pk}/video-token")
@router.post("/{pk}/video-token/")
async def get_video_token(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Interview).where(Interview.id == pk))
    interview = result.scalars().first()
    if not interview or current_user.id not in [interview.interviewer_id, interview.student_id]:
        raise HTTPException(status_code=404, detail="Interview not found or access denied")
    
    token = interview_service.get_video_token(current_user.id, interview)
    return {'token': token, 'call_id': interview.video_call_id}

@router.post("/{pk}/feedback", response_model=FeedbackResponse)
@router.post("/{pk}/feedback/", response_model=FeedbackResponse)
async def create_feedback(
    pk: int,
    request: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    check_interviewer_role(current_user)
    result = await db.execute(select(Interview).where(Interview.id == pk))
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    feedback = await interview_service.submit_feedback(
        db, pk, request.score, request.strengths, request.weaknesses, request.notes
    )
    return feedback

@router.get("/{pk}/feedback", response_model=FeedbackResponse)
@router.get("/{pk}/feedback/", response_model=FeedbackResponse)
async def get_feedback(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(InterviewFeedback).where(InterviewFeedback.interview_id == pk))
    feedback = result.scalars().first()
    if not feedback:
        raise HTTPException(status_code=404, detail="No feedback yet")
    return feedback

@router.post("/{pk}/code-submit", response_model=CodeSubmissionResponse)
@router.post("/{pk}/code-submit/", response_model=CodeSubmissionResponse)
async def submit_code(
    pk: int,
    request: CodeSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Interview).where(Interview.id == pk))
    interview = result.scalars().first()
    if not interview or current_user.id not in [interview.interviewer_id, interview.student_id]:
        raise HTTPException(status_code=404, detail="Interview not found or access denied")
        
    submission = await interview_service.execute_code(
        db, pk, request.language, request.source_code, request.stdin
    )
    return submission
