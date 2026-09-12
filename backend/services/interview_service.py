import logging
from sqlalchemy.ext.asyncio import AsyncSession
from models.interview import Interview, InterviewFeedback, CodeSubmission
from services.code_executor import sandbox

logger = logging.getLogger(__name__)

class VideoServiceMock:
    def create_call(self, call_id, participants):
        class CallInfo:
            def __init__(self, c_id):
                self.call_id = c_id
        return CallInfo(call_id)
        
    def get_token(self, user_id, call_id):
        return f"mock-token-for-{user_id}-on-{call_id}"

video_service = VideoServiceMock()

class InterviewService:
    async def schedule(self, db: AsyncSession, interviewer_id: int, student_id: int, title: str, scheduled_at, description='', duration_min=60):
        interview = Interview(
            interviewer_id=interviewer_id,
            student_id=student_id,
            title=title,
            scheduled_at=scheduled_at,
            description=description,
            duration_min=duration_min,
            status='scheduled'
        )
        db.add(interview)
        await db.commit()
        await db.refresh(interview)
        
        try:
            call_info = video_service.create_call(
                call_id=f'interview-{interview.id}',
                participants=[str(interviewer_id), str(student_id)],
            )
            interview.video_call_id = call_info.call_id
            await db.commit()
            await db.refresh(interview)
        except Exception:
            logger.exception("Failed to create video call room")
            
        return interview

    def get_video_token(self, user_id, interview):
        return video_service.get_token(str(user_id), interview.video_call_id)

    async def submit_feedback(self, db: AsyncSession, interview_id: int, score: int, strengths: list, weaknesses: list, notes=''):
        feedback = InterviewFeedback(
            interview_id=interview_id,
            score=score,
            strengths=strengths,
            weaknesses=weaknesses,
            notes=notes
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback

    async def execute_code(self, db: AsyncSession, interview_id: int, language: str, source_code: str, stdin=''):
        result = await sandbox.execute(language, source_code, stdin)
        submission = CodeSubmission(
            interview_id=interview_id,
            language=language,
            source_code=source_code,
            stdin=stdin,
            stdout=result['stdout'],
            stderr=result['stderr'],
            exit_code=result['exit_code']
        )
        db.add(submission)
        await db.commit()
        await db.refresh(submission)
        return submission

interview_service = InterviewService()
