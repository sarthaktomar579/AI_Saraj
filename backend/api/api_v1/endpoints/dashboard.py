import asyncio
import time
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func

from core.database import get_db
from api.deps import get_current_user
from models.user import User
from models.interview import Interview
from models.ai_interview import AIScheduledInterview, AIInterviewReport
from models.practice import PracticeSession
from schemas.dashboard import DashboardSummaryResponse, DashboardStats
from schemas.jobs import JobPulseResponse
from services.job_service import get_live_tech_jobs

router = APIRouter()

# In-Memory Cache with TTL (Cache-Aside pattern for ultra-fast dashboard queries)
_dashboard_cache: Dict[int, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 30  # 30-second TTL

def invalidate_dashboard_cache(user_id: Optional[int] = None):
    """Invalidates cached dashboard data when an interview or practice session updates."""
    if user_id:
        _dashboard_cache.pop(user_id, None)
    else:
        _dashboard_cache.clear()

@router.get("/summary", response_model=DashboardSummaryResponse)
@router.get("/summary/", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Optimized Aggregated Dashboard Summary (BFF Pattern):
    - In-Memory Cache hit returns in < 1ms
    - Cache miss runs concurrent database queries via asyncio.gather()
    - Uses SQL-level aggregations (COUNT/AVG) instead of client-side loops
    """
    now = time.time()
    cached = _dashboard_cache.get(current_user.id)
    if cached and cached["expires_at"] > now:
        return cached["data"]

    is_interviewer = current_user.role in ['interviewer', 'admin']

    # 1. Fetch human peer interviews
    async def fetch_human_interviews():
        stmt = select(Interview).where(
            or_(Interview.interviewer_id == current_user.id, Interview.student_id == current_user.id)
        ).order_by(Interview.created_at.desc()).limit(10)
        res = await db.execute(stmt)
        return res.scalars().all()

    # 2. Fetch AI scheduled interviews
    async def fetch_ai_interviews():
        if is_interviewer:
            stmt = select(AIScheduledInterview).where(
                AIScheduledInterview.interviewer_id == current_user.id
            ).order_by(AIScheduledInterview.created_at.desc()).limit(20)
        else:
            stmt = select(AIScheduledInterview).where(
                AIScheduledInterview.student_id == current_user.id
            ).order_by(AIScheduledInterview.created_at.desc()).limit(20)
        res = await db.execute(stmt)
        return res.scalars().all()

    # 3. Fetch candidate practice sessions
    async def fetch_practice_sessions():
        if not is_interviewer:
            stmt = select(PracticeSession).where(
                PracticeSession.student_id == current_user.id
            ).order_by(PracticeSession.started_at.desc()).limit(20)
            res = await db.execute(stmt)
            return res.scalars().all()
        return []

    # 4. Fetch candidate student roster (for interviewers scheduling sessions)
    async def fetch_students():
        if is_interviewer:
            stmt = select(User).where(User.role == 'student').order_by(User.first_name.asc())
            res = await db.execute(stmt)
            return res.scalars().all()
        return None

    # 5. Compute aggregate metrics in PostgreSQL using COUNT / AVG
    async def calculate_stats():
        human_cnt_stmt = select(func.count(Interview.id)).where(
            or_(Interview.interviewer_id == current_user.id, Interview.student_id == current_user.id)
        )
        practice_cnt_stmt = select(func.count(PracticeSession.id)).where(
            PracticeSession.student_id == current_user.id
        )

        if is_interviewer:
            ai_filter = (AIScheduledInterview.interviewer_id == current_user.id)
        else:
            ai_filter = (AIScheduledInterview.student_id == current_user.id)

        ai_cnt_stmt = select(func.count(AIScheduledInterview.id)).where(ai_filter)
        ai_comp_stmt = select(func.count(AIScheduledInterview.id)).where(ai_filter, AIScheduledInterview.status == 'completed')

        score_stmt = select(func.avg(AIInterviewReport.total_score)).join(
            AIScheduledInterview, AIInterviewReport.interview_id == AIScheduledInterview.id
        ).where(ai_filter)

        h_cnt = (await db.execute(human_cnt_stmt)).scalar() or 0
        p_cnt = (await db.execute(practice_cnt_stmt)).scalar() or 0
        ai_cnt = (await db.execute(ai_cnt_stmt)).scalar() or 0
        ai_comp = (await db.execute(ai_comp_stmt)).scalar() or 0
        avg_score = (await db.execute(score_stmt)).scalar() or 0.0

        return DashboardStats(
            total_interviews=h_cnt,
            practice_count=p_cnt,
            ai_interview_count=ai_cnt,
            completed_ai_count=ai_comp,
            average_score=round(float(avg_score), 1) if avg_score else 0.0
        )

    # Parallel asynchronous execution via asyncio.gather()
    human_ivs, ai_ivs, practice_sess, students_list, stats_data = await asyncio.gather(
        fetch_human_interviews(),
        fetch_ai_interviews(),
        fetch_practice_sessions(),
        fetch_students(),
        calculate_stats()
    )

    response_data = DashboardSummaryResponse(
        stats=stats_data,
        recent_interviews=human_ivs,
        ai_interviews=ai_ivs,
        practice_sessions=practice_sess,
        students=students_list
    )

    # Save to short-lived in-memory cache
    _dashboard_cache[current_user.id] = {
        "data": response_data,
        "expires_at": now + CACHE_TTL_SECONDS
    }

    return response_data

@router.get("/jobs", response_model=JobPulseResponse)
@router.get("/jobs/", response_model=JobPulseResponse)
async def get_dashboard_jobs(
    track: Optional[str] = None,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Real-Time Tech Jobs & Hiring Pulse:
    - Cached for 15 minutes (in-memory)
    - Sub-millisecond latency on cache hits
    - Circuit breaker with curated fallbacks
    - Automatically mapped to candidate's track (frontend/backend/fullstack/data_analyst)
    """
    return await get_live_tech_jobs(track=track)


