import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.ai_interview import AIScheduledInterview, AIInterviewQuestion, AIInterviewAnswer, AIInterviewReport
from services.gemini_client import gemini_client
from services.code_executor import sandbox

from services.verbal_question_bank import get_verbal_questions_for_tracks
import random

logger = logging.getLogger(__name__)

class AIInterviewService:
    async def schedule(self, db: AsyncSession, interviewer_id: int, request_data: dict):
        interview = AIScheduledInterview(
            interviewer_id=interviewer_id,
            student_id=request_data['student_id'],
            topic=request_data['topic'],
            difficulty=request_data['difficulty'],
            scheduled_at=request_data['scheduled_at'].replace(tzinfo=None),
            deadline=request_data.get('deadline').replace(tzinfo=None) if request_data.get('deadline') else None,
            company_name=request_data.get('company_name', ''),
            selected_tracks=request_data.get('selected_tracks', []),
            selected_subcategories=request_data.get('selected_subcategories', {}),
            status='scheduled'
        )
        db.add(interview)
        await db.commit()
        await db.refresh(interview)
        return interview

    async def start(self, db: AsyncSession, interview: AIScheduledInterview):
        interview.status = 'in_progress'
        
        # Pre-generate questions if not exists
        result = await db.execute(select(AIInterviewQuestion).where(AIInterviewQuestion.interview_id == interview.id))
        existing = result.scalars().all()
        if not existing:
            selected_tracks = [t.lower() for t in (interview.selected_tracks or []) if t.lower() != 'dsa']
            selected_sub_map = {
                k.lower(): [s.lower() for s in (v or [])]
                for k, v in (interview.selected_subcategories or {}).items()
            }
            fallback_pool = get_verbal_questions_for_tracks(selected_tracks, selected_sub_map)
            random.shuffle(fallback_pool)
            
            questions_to_add = fallback_pool[:8] if fallback_pool else []
            for i, q in enumerate(questions_to_add):
                question = AIInterviewQuestion(
                    interview_id=interview.id,
                    question_text=q.get('question_text', 'Tell me about your approach to this topic.'),
                    difficulty_level=interview.difficulty or 'medium',
                    question_type='verbal',
                    order=i
                )
                db.add(question)
                
        await db.commit()
        return interview

    async def get_next_question(self, db: AsyncSession, interview: AIScheduledInterview, current_index: int):
        result = await db.execute(select(AIInterviewQuestion).where(AIInterviewQuestion.interview_id == interview.id, AIInterviewQuestion.order == current_index))
        return result.scalars().first()

    async def submit_answer(self, db: AsyncSession, interview: AIScheduledInterview, question_id: int, text_answer='', code_answer='', language=''):
        result = await db.execute(select(AIInterviewQuestion).where(AIInterviewQuestion.id == question_id, AIInterviewQuestion.interview_id == interview.id))
        question = result.scalars().first()
        
        execution_result = None
        if code_answer and language:
            execution_result = await sandbox.execute(language, code_answer)
            
        ans_res = await db.execute(select(AIInterviewAnswer).where(AIInterviewAnswer.question_id == question.id))
        answer = ans_res.scalars().first()
        if not answer:
            answer = AIInterviewAnswer(
                question_id=question.id,
                text_answer=text_answer,
                code_answer=code_answer,
                language=language,
                execution_result=execution_result
            )
            db.add(answer)
        else:
            answer.text_answer = text_answer
            answer.code_answer = code_answer
            answer.language = language
            answer.execution_result = execution_result
            
        await db.commit()
        await db.refresh(answer)
        return answer

    async def complete(self, db: AsyncSession, interview: AIScheduledInterview):
        prompt = f"Evaluate this scheduled interview for tracks {interview.selected_tracks}."
        raw = await gemini_client.generate_json(prompt)
        
        report = AIInterviewReport(
            interview_id=interview.id,
            total_score=raw.get('score', 75),
            communication=raw.get('communication', 15),
            technical_depth=raw.get('technical_depth', 20),
            code_quality=raw.get('code_quality', 15),
            optimization=raw.get('optimization', 10),
            problem_solving=raw.get('problem_solving', 15),
            warning_count=0,
            hiring_signal=raw.get('hiring_signal', 'Hire'),
            raw_ai_response=raw
        )
        db.add(report)
        interview.status = 'completed'
        await db.commit()
        await db.refresh(report)
        return report

ai_interview_service = AIInterviewService()
