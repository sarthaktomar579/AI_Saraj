from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from typing import List, Any
from core.database import get_db
from api.deps import get_current_user
from models.user import User
from models.practice import PracticeSession, AIQuestion, AIAnswer, PracticeEvaluation
from schemas.practice import (
    SessionCreate, SessionDetailResponse, AIQuestionResponse, 
    StartQuestionsResponse, AnswerSubmit, PracticeEvaluationResponse, EvaluateRequest
)
from services.practice_service import practice_service

from datetime import datetime, timezone

router = APIRouter()

@router.post("", response_model=SessionDetailResponse)
@router.post("/", response_model=SessionDetailResponse)
async def create_session(
    request: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    session = await practice_service.start_session(
        db,
        student_id=current_user.id,
        topic=request.topic,
        difficulty=request.difficulty,
        selected_tracks=request.selected_tracks,
        selected_subcategories=request.selected_subcategories,
        session_type=request.session_type,
        scheduled_interview_id=request.scheduled_interview_id
    )
    return session

@router.get("", response_model=List[SessionDetailResponse])
@router.get("/", response_model=List[SessionDetailResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession)
        .where(
            PracticeSession.student_id == current_user.id,
            PracticeSession.session_type == 'practice',
            PracticeSession.scheduled_interview_id.is_(None)
        )
        .order_by(PracticeSession.started_at.desc())
    )
    sessions = result.scalars().all()
    needs_commit = False
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for s in sessions:
        if s.status == 'active':
            if s.evaluation:
                s.status = 'completed'
                needs_commit = True
            elif s.started_at and (now - s.started_at).total_seconds() > 900:
                s.status = 'abandoned'
                needs_commit = True
    if needs_commit:
        await db.commit()
    return sessions

@router.delete("/{pk}")
@router.delete("/{pk}/")
async def delete_session_endpoint(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Explicitly clean up evaluation and question answers to satisfy all foreign key constraints
    await db.execute(delete(PracticeEvaluation).where(PracticeEvaluation.session_id == pk))
    q_res = await db.execute(select(AIQuestion.id).where(AIQuestion.session_id == pk))
    q_ids = q_res.scalars().all()
    if q_ids:
        await db.execute(delete(AIAnswer).where(AIAnswer.question_id.in_(q_ids)))
        await db.execute(delete(AIQuestion).where(AIQuestion.session_id == pk))
        
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted"}

@router.get("/{pk}", response_model=SessionDetailResponse)
@router.get("/{pk}/", response_model=SessionDetailResponse)
async def get_session(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.session_type == 'scheduled' and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Results for scheduled interviews are only visible to the interviewer.")
    return session

@router.post("/{pk}/questions/start", response_model=StartQuestionsResponse)
@router.post("/{pk}/questions/start/", response_model=StartQuestionsResponse)
async def start_questions(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session or session.status != 'active':
        raise HTTPException(status_code=404, detail="Active session not found")
        
    questions = await practice_service.create_track_questions(db, session)
    return {
        "message": f"Generated {len(questions)} interview questions.",
        "questions": questions
    }

@router.post("/{pk}/questions/acknowledge")
@router.post("/{pk}/questions/acknowledge/")
async def acknowledge_answer(
    pk: int,
    request: AnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session or session.status != 'active':
        raise HTTPException(status_code=404, detail="Active session not found")
        
    await practice_service.submit_answer(db, session, request.question_id, request.text_answer)
    ack = await practice_service.acknowledge_answer(db, session, request.question_id, request.text_answer)
    return ack

@router.post("/{pk}/questions/next", response_model=AIQuestionResponse)
@router.post("/{pk}/questions/next/", response_model=AIQuestionResponse)
async def next_question(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session or session.status != 'active':
        raise HTTPException(status_code=404, detail="Active session not found")
        
    q_result = await db.execute(
        select(AIQuestion).where(AIQuestion.session_id == session.id, AIQuestion.order == session.current_q_index)
    )
    question = q_result.scalars().first()
    if question:
        session.current_q_index += 1
        await db.commit()
        return question
    raise HTTPException(status_code=404, detail="No more questions")

@router.post("/{pk}/leetcode", response_model=AIQuestionResponse)
@router.post("/{pk}/leetcode/", response_model=AIQuestionResponse)
async def get_leetcode(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session or session.status != 'active':
        raise HTTPException(status_code=404, detail="Active session not found")
        
    question = await practice_service.generate_leetcode(db, session)
    return question

@router.post("/{pk}/submit")
@router.post("/{pk}/submit/")
async def submit_answer(
    pk: int,
    request: AnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session or session.status != 'active':
        raise HTTPException(status_code=404, detail="Active session not found")
        
    await practice_service.submit_answer(db, session, request.question_id, request.text_answer, request.code_answer, request.language)
    return {"status": "submitted"}

@router.post("/{pk}/evaluate", response_model=PracticeEvaluationResponse)
@router.post("/{pk}/evaluate/", response_model=PracticeEvaluationResponse)
async def evaluate_session(
    pk: int,
    request: EvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    evaluation = await practice_service.evaluate_comprehensive(
        db, session, 
        code_explanation=request.code_explanation, 
        warning_count=request.warning_count, 
        disqualified=request.disqualified, 
        disqualify_reason=request.disqualify_reason
    )
    return evaluation

@router.get("/{pk}/evaluate", response_model=PracticeEvaluationResponse)
@router.get("/{pk}/evaluate/", response_model=PracticeEvaluationResponse)
async def get_session_evaluation(
    pk: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == pk, PracticeSession.student_id == current_user.id)
    )
    session = result.scalars().first()
    if not session or not session.evaluation:
        raise HTTPException(status_code=404, detail="Not evaluated yet")
    return session.evaluation
