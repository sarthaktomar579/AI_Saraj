"""AI Interview service layer."""
import random
from django.utils import timezone
from django.core.files.storage import default_storage
from ai_engine.services import AIEngineService
from apps.code_execution.services import SandboxService
from apps.ai_practice.verbal_question_bank import get_verbal_questions_for_tracks
from apps.ai_practice.dsa_prompts import get_full_prompt
from .models import AIScheduledInterview, AIInterviewQuestion, AIInterviewAnswer, AIInterviewReport


class AIInterviewService:
    def __init__(self):
        self.ai_engine = AIEngineService()
        self.sandbox = SandboxService()

    def schedule(self, interviewer, student, topic, difficulty, scheduled_at,
                 deadline=None, company_name='', selected_tracks=None, selected_subcategories=None):
        return AIScheduledInterview.objects.create(
            interviewer=interviewer, student=student,
            topic=topic, difficulty=difficulty,
            scheduled_at=scheduled_at, status='scheduled',
            deadline=deadline,
            company_name=company_name,
            selected_tracks=selected_tracks or [],
            selected_subcategories=selected_subcategories or {},
        )

    def start(self, interview):
        interview.status = 'in_progress'
        interview.save()
        return interview

    def get_next_question(self, interview):
        current_count = interview.questions.count()
        tracks = [t.lower() for t in (interview.selected_tracks or [])]
        subs = interview.selected_subcategories or {}
        verbal_tracks = [t for t in tracks if t != 'dsa']
        used_texts = set(
            interview.questions.values_list('question_text', flat=True)
        )

        if verbal_tracks and current_count < 8:
            pool = get_verbal_questions_for_tracks(verbal_tracks, subs)
            random.shuffle(pool)
            for item in pool:
                if item['question_text'] not in used_texts:
                    return AIInterviewQuestion.objects.create(
                        interview=interview,
                        question_text=item['question_text'],
                        difficulty_level=interview.difficulty,
                        question_type='verbal',
                        order=current_count,
                    )

        if 'dsa' in tracks:
            from apps.ai_practice.services import PracticeService
            svc = PracticeService()
            dsa_subs = subs.get('dsa', [])
            bank = svc._dsa_question_bank()
            allowed = {s.lower() for s in dsa_subs} if dsa_subs else None
            candidates = [q for q in bank
                          if q['problem_name'] not in used_texts
                          and (not allowed or q['subcategory'].lower() in allowed)]
            if candidates:
                chosen = random.choice(candidates)
                return AIInterviewQuestion.objects.create(
                    interview=interview,
                    question_text=chosen['question_text'],
                    difficulty_level=interview.difficulty,
                    question_type='coding',
                    order=current_count,
                )

        return AIInterviewQuestion.objects.create(
            interview=interview,
            question_text='Tell me about a challenging technical problem you solved recently.',
            difficulty_level=interview.difficulty,
            question_type='verbal',
            order=current_count,
        )

    def submit_answer(self, interview, question_id, text_answer='', code_answer='', language=''):
        question = AIInterviewQuestion.objects.get(id=question_id, interview=interview)
        execution_result = None
        if code_answer and language:
            execution_result = self.sandbox.execute(language, code_answer)
        return AIInterviewAnswer.objects.create(
            question=question, text_answer=text_answer,
            code_answer=code_answer, language=language,
            execution_result=execution_result,
        )

    def upload_recording(self, interview, file):
        path = default_storage.save(
            f'recordings/ai-interviews/{interview.id}/{file.name}', file
        )
        interview.recording_url = default_storage.url(path)
        interview.save()
        return interview.recording_url

    def complete(self, interview):
        transcript = self._build_transcript(interview)
        raw = self.ai_engine.evaluate_interview(interview.topic, transcript)
        report = AIInterviewReport.objects.create(
            interview=interview,
            total_score=raw.get('score', 0),
            communication=raw.get('communication', 0),
            technical_depth=raw.get('technical_depth', 0),
            code_quality=raw.get('code_quality', 0),
            optimization=raw.get('optimization', 0),
            problem_solving=raw.get('problem_solving', 0),
            strengths=raw.get('strengths', []),
            weaknesses=raw.get('weaknesses', []),
            improvement_plan=raw.get('improvement_plan', []),
            recommended_topics=raw.get('recommended_topics', []),
            hiring_signal=raw.get('hiring_signal', 'uncertain'),
            skill_gap_analysis=raw.get('skill_gap_analysis', {}),
            raw_ai_response=raw,
        )
        interview.status = 'completed'
        interview.save()
        return report

    def _build_transcript(self, interview):
        lines = []
        for q in interview.questions.prefetch_related('answer').order_by('order'):
            lines.append(f'Q{q.order + 1} [{q.difficulty_level}]: {q.question_text}')
            if hasattr(q, 'answer'):
                a = q.answer
                if a.text_answer:
                    lines.append(f'A (text): {a.text_answer}')
                if a.code_answer:
                    lines.append(f'A (code - {a.language}):\n{a.code_answer}')
                    if a.execution_result:
                        lines.append(f'Output: {a.execution_result.get("stdout", "")}')
        return '\n'.join(lines)
