import logging
import random
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.practice import PracticeSession, AIQuestion, AIAnswer, PracticeEvaluation
from services.gemini_client import gemini_client
from services.code_executor import sandbox
from services.verbal_question_bank import get_verbal_questions_for_tracks
from services.dsa_prompts import get_full_prompt

logger = logging.getLogger(__name__)

class PracticeService:
    async def start_session(
        self, db: AsyncSession, student_id: int, topic: str, difficulty: str,
        selected_tracks: list, selected_subcategories: dict,
        session_type='practice', scheduled_interview_id=None
    ):
        session = PracticeSession(
            student_id=student_id,
            topic=topic,
            difficulty=difficulty,
            selected_tracks=selected_tracks or [],
            selected_subcategories=selected_subcategories or {},
            session_type=session_type or 'practice',
            scheduled_interview_id=scheduled_interview_id,
            status='active'
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def create_track_questions(self, db: AsyncSession, session: PracticeSession, question_count=8):
        """Generate varied verbal questions from selected interview tracks."""
        selected_tracks = [t.lower() for t in (session.selected_tracks or []) if t.lower() != 'dsa']
        selected_subcategories = session.selected_subcategories or {}
        if not selected_tracks:
            return []

        questions_data = await self._normalize_track_questions(
            db=db,
            session=session,
            selected_tracks=selected_tracks,
            selected_subcategories=selected_subcategories,
            difficulty=session.difficulty,
            question_count=question_count,
        )

        questions = []
        for i, q_data in enumerate(questions_data[:question_count]):
            question = AIQuestion(
                session_id=session.id,
                question_text=q_data.get('question_text', 'Tell me about your approach to this topic.'),
                difficulty_level=q_data.get('difficulty_level', session.difficulty or 'medium'),
                question_type='verbal',
                order=i
            )
            db.add(question)
            questions.append(question)
            
        session.current_q_index = 0
        await db.commit()
        for q in questions:
            await db.refresh(q)
        return questions

    async def _normalize_track_questions(self, db: AsyncSession, session: PracticeSession, selected_tracks, selected_subcategories, difficulty, question_count):
        selected_sub_map = {
            k.lower(): [s.lower() for s in (v or [])]
            for k, v in (selected_subcategories or {}).items()
        }
        
        fallback_pool = get_verbal_questions_for_tracks(selected_tracks, selected_sub_map)
        for item in fallback_pool:
            item['difficulty_level'] = difficulty

        random.shuffle(fallback_pool)
        normalized = []
        seen = set()
        for item in fallback_pool:
            text = item['question_text'].strip()
            text_key = text.lower()
            if text_key not in seen:
                seen.add(text_key)
                normalized.append(item)
            if len(normalized) >= question_count:
                break
                
        # If pool is smaller than question count, allow duplicates
        idx = 0
        while len(normalized) < question_count and fallback_pool:
            normalized.append(fallback_pool[idx % len(fallback_pool)])
            idx += 1
            if idx > question_count * 2:
                break

        return normalized[:question_count]

    async def acknowledge_answer(self, db: AsyncSession, session: PracticeSession, question_id: int, answer_text: str):
        result = await db.execute(select(AIQuestion).where(AIQuestion.id == question_id, AIQuestion.session_id == session.id))
        question = result.scalars().first()
        cleaned = (answer_text or '').strip()
        
        if question:
            ans_res = await db.execute(select(AIAnswer).where(AIAnswer.question_id == question.id))
            answer = ans_res.scalars().first()
            if not answer:
                answer = AIAnswer(question_id=question.id, text_answer=cleaned)
                db.add(answer)
            else:
                answer.text_answer = cleaned
            await db.commit()

        if not cleaned:
            return {
                'response': 'No answer detected for this question. Let us move to the next one.',
                'candidate_asked_question': False,
                'answer_quality': 'no_answer',
            }

        prompt = (
            f"You are AI Saraj, an interviewer. The candidate just answered the question:\n"
            f"Question: {question.question_text if question else ''}\n"
            f"Candidate Answer: {cleaned}\n\n"
            f"INSTRUCTIONS:\n"
            f"- If the candidate says things like 'can you repeat that', 'pardon', 'pardon?', 'repeat please', or asks to repeat the question, your 'response' MUST politely repeat the question.\n"
            f"- If the candidate asks you to explain the question, give a brief hint.\n"
            f"- Otherwise, acknowledge their answer briefly (1-2 sentences).\n"
            f"Output JSON with keys: 'response' (string), 'candidate_asked_question' (boolean, true if they asked to repeat/explain), 'answer_quality' (good/average/poor/no_answer)."
        )
        try:
            return await gemini_client.generate_json(prompt)
        except Exception:
            return {
                'response': 'Thank you. Let us proceed to the next question.',
                'candidate_asked_question': False,
                'answer_quality': 'average',
            }

    async def generate_leetcode(self, db: AsyncSession, session: PracticeSession):
        dsa_subcategories = session.selected_subcategories.get('dsa', []) if session.selected_subcategories else []
        q_data = self._pick_random_dsa_question(dsa_subcategories, session.difficulty)
        
        question = AIQuestion(
            session_id=session.id,
            question_text=q_data.get('question_text', 'Solve this coding problem.'),
            difficulty_level=q_data.get('difficulty_level', session.difficulty),
            question_type='coding',
            order=session.current_q_index
        )
        db.add(question)
        session.current_q_index += 1
        await db.commit()
        await db.refresh(question)
        return question

    def _pick_random_dsa_question(self, dsa_subcategories, difficulty):
        bank = self._dsa_question_bank()
        allowed_subs = {s.lower() for s in (dsa_subcategories or [])}
        candidates = []
        for item in bank:
            if allowed_subs and item['subcategory'].lower() not in allowed_subs:
                continue
            candidates.append(item)
        if not candidates:
            candidates = bank
        chosen = random.choice(candidates)
        result = dict(chosen)
        result['difficulty_level'] = difficulty
        result['question_type'] = 'coding'
        return result

    def _dsa_question_bank(self):
        names = [
            ('Two Sum', 'Arrays'),
            ('Best Time to Buy and Sell Stock', 'Arrays'),
            ('Contains Duplicate', 'Arrays'),
            ('Product of Array Except Self', 'Arrays'),
            ('Maximum Subarray', 'Arrays'),
            ('3Sum', 'Arrays'),
            ('Container With Most Water', 'Arrays'),
            ('Find Minimum in Rotated Sorted Array', 'Arrays'),
            ('Search in Rotated Sorted Array', 'Arrays'),
            ('Top K Frequent Elements', 'Arrays'),
            ('Valid Anagram', 'Strings'),
            ('Group Anagrams', 'Strings'),
            ('Longest Substring Without Repeating Characters', 'Strings'),
            ('Longest Repeating Character Replacement', 'Strings'),
            ('Minimum Window Substring', 'Strings'),
            ('Valid Parentheses', 'Strings'),
            ('Palindromic Substrings', 'Strings'),
            ('Longest Palindromic Substring', 'Strings'),
            ('Reverse Linked List', 'Linked List'),
            ('Linked List Cycle', 'Linked List'),
            ('Merge Two Sorted Lists', 'Linked List'),
            ('Remove Nth Node From End of List', 'Linked List'),
            ('Binary Tree Inorder Traversal', 'Trees'),
            ('Maximum Depth of Binary Tree', 'Trees'),
            ('Same Tree', 'Trees'),
            ('Invert Binary Tree', 'Trees'),
            ('Number of Islands', 'Graphs'),
            ('Clone Graph', 'Graphs'),
            ('Climbing Stairs', 'DP'),
            ('House Robber', 'DP'),
            ('Coin Change', 'DP'),
        ]
        bank = []
        for idx, (name, sub) in enumerate(names, start=1):
            prompt = get_full_prompt(name, sub, idx)
            bank.append({
                'problem_name': name,
                'subcategory': sub,
                'question_text': prompt,
                'expected_complexity': 'Optimized complexity',
                'expected_time_minutes': 15,
            })
        return bank

    async def submit_answer(self, db: AsyncSession, session: PracticeSession, question_id: int, text_answer='', code_answer='', language=''):
        result = await db.execute(select(AIQuestion).where(AIQuestion.id == question_id, AIQuestion.session_id == session.id))
        question = result.scalars().first()
        
        execution_result = None
        if code_answer and language:
            execution_result = await sandbox.execute(language, code_answer)
            
        ans_res = await db.execute(select(AIAnswer).where(AIAnswer.question_id == question.id))
        answer = ans_res.scalars().first()
        if not answer:
            answer = AIAnswer(
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

    async def evaluate_comprehensive(self, db: AsyncSession, session: PracticeSession, code_explanation='', warning_count=0, disqualified=False, disqualify_reason=''):
        prompt = (
            f"Evaluate this practice interview session for tracks: {session.selected_tracks}, "
            f"difficulty: {session.difficulty}, warning_count: {warning_count}, disqualified: {disqualified}. "
            f"Provide an evaluation in JSON format with fields: score (integer 0-100), communication (0-20), "
            f"technical_depth (0-20), code_quality (0-20), optimization (0-20), problem_solving (0-20), proctoring_score (integer 0-10 based on warning_count and disqualified), "
            f"strengths (list of strings), weaknesses (list of strings), improvement_plan (list of strings), "
            f"recommended_topics (list of strings), hiring_signal ('Strong Hire'/'Hire'/'Consider'/'No Hire')."
        )
        try:
            raw = await gemini_client.generate_json(prompt)
        except Exception:
            raw = {}
        
        if disqualified:
            total_score = 0
            hiring_signal = 'No Hire'
            weaknesses = [f'Disqualified: {disqualify_reason}']
            communication = 0
            technical_depth = 0
            code_quality = 0
            optimization = 0
            problem_solving = 0
        else:
            total_score = raw.get('score', 75)
            hiring_signal = raw.get('hiring_signal', 'Hire')
            weaknesses = raw.get('weaknesses', ['Continue practicing advanced topics'])
            communication = raw.get('communication', 16)
            technical_depth = raw.get('technical_depth', 16)
            code_quality = raw.get('code_quality', 15)
            optimization = raw.get('optimization', 14)
            problem_solving = raw.get('problem_solving', 14)

        evaluation = PracticeEvaluation(
            session_id=session.id,
            total_score=total_score,
            communication=communication,
            technical_depth=technical_depth,
            code_quality=code_quality,
            optimization=optimization,
            problem_solving=problem_solving,
            strengths=raw.get('strengths', ['Solid foundational understanding', 'Clear articulation']),
            weaknesses=weaknesses,
            improvement_plan=raw.get('improvement_plan', ['Review data structures and algorithmic complexity']),
            recommended_topics=raw.get('recommended_topics', session.selected_tracks or []),
            hiring_signal=hiring_signal,
            raw_ai_response=raw
        )
        db.add(evaluation)
        session.status = 'completed'
        session.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(evaluation)
        return evaluation

practice_service = PracticeService()
