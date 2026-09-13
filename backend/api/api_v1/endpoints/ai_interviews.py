from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List, Any
from core.database import get_db
from api.deps import get_current_user
from models.user import User
from models.ai_interview import AIScheduledInterview, AIInterviewReport
from schemas.user import User as UserSchema
from schemas.ai_interview import (
    AIInterviewCreate, AIInterviewUpdate, AIInterviewDetailResponse, 
    AIInterviewQuestionResponse, AIAnswerSubmit, 
    AIInterviewReportResponse, AIInterviewReportCreate
)
from services.ai_interview_service import ai_interview_service

router = APIRouter()

def check_interviewer_role(current_user: User):
    if current_user.role not in ['interviewer', 'admin']:
        raise HTTPException(status_code=403, detail="Not an interviewer")
    return current_user

@router.get("/students", response_model=List[UserSchema])
@router.get("/students/", response_model=List[UserSchema])
async def list_students(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    check_interviewer_role(current_user)
    result = await db.execute(select(User).where(User.role == 'student'))
    return result.scalars().all()

@router.post("", response_model=AIInterviewDetailResponse)
@router.post("/", response_model=AIInterviewDetailResponse)
async def create_interview(
    request: AIInterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    check_interviewer_role(current_user)
    interview = await ai_interview_service.schedule(
        db=db,
        interviewer_id=current_user.id,
        request_data=request.model_dump()
    )
    res = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == interview.id))
    return res.scalars().first()

@router.put("/{pk}", response_model=AIInterviewDetailResponse)
@router.put("/{pk}/", response_model=AIInterviewDetailResponse)
async def update_interview(
    pk: int,
    request: AIInterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    check_interviewer_role(current_user)
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk))
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.interviewer_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to edit this interview")
    if interview.status == 'completed':
        raise HTTPException(status_code=400, detail="Cannot edit a completed interview")
    
    sid = request.student_id or request.student
    if sid is not None:
        interview.student_id = sid
    if request.topic is not None:
        interview.topic = request.topic
    if request.difficulty is not None:
        interview.difficulty = request.difficulty
    if request.deadline is not None:
        interview.deadline = request.deadline.replace(tzinfo=None) if request.deadline.tzinfo else request.deadline
    if request.company_name is not None:
        interview.company_name = request.company_name
    if request.selected_tracks is not None:
        interview.selected_tracks = request.selected_tracks
    if request.selected_subcategories is not None:
        interview.selected_subcategories = request.selected_subcategories
        
    await db.commit()
    res = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk))
    return res.scalars().first()

@router.delete("/{pk}")
@router.delete("/{pk}/")
async def delete_interview(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    check_interviewer_role(current_user)
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk))
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.interviewer_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to delete this interview")
    await db.delete(interview)
    await db.commit()
    return {"message": "Interview deleted successfully"}

@router.get("", response_model=List[AIInterviewDetailResponse])
@router.get("/", response_model=List[AIInterviewDetailResponse])
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(AIScheduledInterview).where(
            or_(AIScheduledInterview.interviewer_id == current_user.id, AIScheduledInterview.student_id == current_user.id)
        ).order_by(AIScheduledInterview.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{pk}", response_model=AIInterviewDetailResponse)
@router.get("/{pk}/", response_model=AIInterviewDetailResponse)
async def get_interview(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk))
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if current_user.id not in [interview.interviewer_id, interview.student_id]:
        raise HTTPException(status_code=403, detail="Not a participant")
    return interview

@router.patch("/{pk}/start")
@router.patch("/{pk}/start/")
async def start_interview(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk, AIScheduledInterview.student_id == current_user.id))
    interview = result.scalars().first()
    if not interview or interview.status != 'scheduled':
        raise HTTPException(status_code=400, detail="Invalid interview state")
        
    await ai_interview_service.start(db, interview)
    return {"status": "in_progress"}

@router.post("/{pk}/questions/next", response_model=AIInterviewQuestionResponse)
@router.post("/{pk}/questions/next/", response_model=AIInterviewQuestionResponse)
async def next_question(
    pk: int,
    current_index: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk, AIScheduledInterview.student_id == current_user.id))
    interview = result.scalars().first()
    if not interview or interview.status != 'in_progress':
        raise HTTPException(status_code=404, detail="Active interview not found")
        
    question = await ai_interview_service.get_next_question(db, interview, current_index)
    if not question:
        raise HTTPException(status_code=404, detail="No more questions")
    return question

@router.post("/{pk}/submit")
@router.post("/{pk}/submit/")
async def submit_answer(
    pk: int,
    request: AIAnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk, AIScheduledInterview.student_id == current_user.id))
    interview = result.scalars().first()
    if not interview or interview.status != 'in_progress':
        raise HTTPException(status_code=404, detail="Active interview not found")
        
    await ai_interview_service.submit_answer(db, interview, request.question_id, request.text_answer, request.code_answer, request.language)
    return {"status": "submitted"}

@router.post("/{pk}/complete", response_model=AIInterviewReportResponse)
@router.post("/{pk}/complete/", response_model=AIInterviewReportResponse)
async def complete_interview(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk, AIScheduledInterview.student_id == current_user.id))
    interview = result.scalars().first()
    if not interview or interview.status != 'in_progress':
        raise HTTPException(status_code=404, detail="Active interview not found")
        
    report = await ai_interview_service.complete(db, interview)
    return report

@router.post("/{pk}/report", response_model=AIInterviewReportResponse)
@router.post("/{pk}/report/", response_model=AIInterviewReportResponse)
async def save_report(
    pk: int,
    request: AIInterviewReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(AIScheduledInterview).where(AIScheduledInterview.id == pk, AIScheduledInterview.student_id == current_user.id))
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    report = AIInterviewReport(
        interview_id=interview.id,
        total_score=request.total_score,
        communication=request.communication,
        technical_depth=request.technical_depth,
        code_quality=request.code_quality,
        optimization=request.optimization,
        problem_solving=request.problem_solving,
        warning_count=request.warning_count,
        disqualified=request.disqualified,
        disqualify_reason=request.disqualify_reason,
        strengths=request.strengths,
        weaknesses=request.weaknesses,
        improvement_plan=request.improvement_plan,
        recommended_topics=request.recommended_topics,
        hiring_signal=request.hiring_signal,
        skill_gap_analysis=request.skill_gap_analysis,
        raw_ai_response=request.raw_ai_response
    )
    db.add(report)
    interview.status = 'completed'
    await db.commit()
    await db.refresh(report)
    return report

@router.get("/{pk}/report", response_model=AIInterviewReportResponse)
@router.get("/{pk}/report/", response_model=AIInterviewReportResponse)
async def get_report(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    check_interviewer_role(current_user)
    result = await db.execute(select(AIInterviewReport).where(AIInterviewReport.interview_id == pk))
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="No report yet")
    return report
