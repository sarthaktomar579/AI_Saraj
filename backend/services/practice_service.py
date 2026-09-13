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

    async def create_track_questions(self, db: AsyncSession, session: PracticeSession, question_count=None):
        """Generate varied verbal questions from selected interview tracks."""
        raw_tracks = session.selected_tracks or []
        if isinstance(raw_tracks, str):
            raw_tracks = [raw_tracks]
        selected_tracks = [str(t).lower().strip() for t in raw_tracks if str(t).lower().strip() != 'dsa']
        if not selected_tracks and session.topic:
            selected_tracks = [t.strip().lower() for t in session.topic.split(',')]
        if not selected_tracks:
            return []

        selected_subcategories = session.selected_subcategories or {}

        is_express = bool({'fullstack', 'express_tech'} & set(selected_tracks)) or 'fullstack' in (session.topic or '').lower()
        if question_count is None:
            question_count = 3 if is_express else 8

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

        if bool({'fullstack', 'express_tech'} & set(selected_tracks)):
            # Fullstack pool is already sampled & balanced (1 FE, 1 BE, 1 DB)
            return fallback_pool[:question_count]

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

        # Fast path: check if candidate asked to repeat or clarify the question
        lower_ans = cleaned.lower()
        repeat_triggers = ['repeat', 'pardon', 'say again', 'what was the question', 'one more time', 'explain the question']
        candidate_asked = any(t in lower_ans for t in repeat_triggers)

        if not candidate_asked:
            return {
                'response': 'Noted, thank you.',
                'candidate_asked_question': False,
                'answer_quality': 'answered' if cleaned else 'no_answer',
            }

        prompt = (
            f"You are AISaraj, an interviewer. The candidate asked for clarification or repetition on:\n"
            f"Question: {question.question_text if question else ''}\n"
            f"Candidate Request: {cleaned}\n\n"
            f"Politely repeat the question clearly or give a brief 1-sentence clarification.\n"
            f"Output JSON with keys: 'response' (string), 'candidate_asked_question' (true)."
        )
        try:
            return await gemini_client.generate_json(prompt)
        except Exception:
            return {
                'response': question.question_text if question else 'Please provide your answer to the question.',
                'candidate_asked_question': True,
                'answer_quality': 'repeat_requested',
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
        # Query questions and candidate answers for this session
        q_result = await db.execute(
            select(AIQuestion).where(AIQuestion.session_id == session.id).order_by(AIQuestion.order)
        )
        questions = q_result.scalars().all()
        qa_pairs = []
        for q in questions:
            ans_result = await db.execute(select(AIAnswer).where(AIAnswer.question_id == q.id))
            ans = ans_result.scalars().first()
            user_text = (ans.text_answer or '').strip() if ans else ''
            user_code = (ans.code_answer or '').strip() if ans else ''
            qa_pairs.append({
                "question": q.question_text,
                "type": q.question_type,
                "spoken_answer": user_text if user_text else "(No answer provided / silence)",
                "code_answer": user_code if user_code else ""
            })

        transcript_lines = []
        for i, item in enumerate(qa_pairs):
            line = f"Question {i+1} [{item['type']}]: {item['question']}\nCandidate Answer: {item['spoken_answer']}"
            if item['code_answer']:
                line += f"\nCode Submitted:\n{item['code_answer']}"
            transcript_lines.append(line)
        transcript_str = "\n\n".join(transcript_lines) if transcript_lines else "(No questions answered)"

        has_dsa = 'dsa' in (session.selected_tracks or [])
        if has_dsa:
            dimension_instructions = (
                "  * communication (integer 0-20): clarity, technical vocabulary, structure (vague/brief answers: 8-12)\n"
                "  * technical_depth (integer 0-25): accuracy of concepts, mechanisms, trade-offs (vague answers: 9-13)\n"
                "  * code_quality (integer 0-20): code structure, syntax accuracy and best practices (vague answers: 8-12)\n"
                "  * optimization (integer 0-15): runtime/space complexity awareness (vague answers: 5-8)\n"
                "  * problem_solving (integer 0-20): algorithmic logic and edge-case handling (vague answers: 8-12)\n"
            )
        else:
            dimension_instructions = (
                "  * communication (integer 0-20): clarity, professional articulation and structured explanation (vague/brief answers: 8-12)\n"
                "  * technical_depth (integer 0-25): accuracy of core engineering concepts, mechanisms and trade-offs (vague answers: 9-13)\n"
                "  * code_quality (integer 0-20): Best Practices & Architecture: clean architecture, design patterns, safety standards and conventions mentioned in spoken answers (vague answers: 8-12)\n"
                "  * optimization (integer 0-15): Performance & Scalability: indexing, caching, database query optimization, latency reduction and bottleneck prevention (vague answers: 5-8)\n"
                "  * problem_solving (integer 0-20): Conceptual Clarity & Domain Knowledge: precision of domain understanding and real-world troubleshooting logic (vague answers: 8-12)\n"
            )

        prompt = (
            f"You are AISaraj, an expert, rigorous and strict technical interviewer evaluating a software engineering candidate.\n"
            f"Tracks: {session.selected_tracks}, Difficulty: {session.difficulty}, Warnings: {warning_count}, Disqualified: {disqualified}.\n"
            f"Code Explanation (if any): {code_explanation}\n\n"
            f"--- CANDIDATE INTERVIEW TRANSCRIPT ---\n"
            f"{transcript_str}\n"
            f"--- END TRANSCRIPT ---\n\n"
            f"CRITICAL STRICT SCORING DIRECTIVES:\n"
            f"- Grade strictly and realistically according to professional industry standards:\n"
            f"- If the candidate's answers are superficial, vague, or partially relevant (e.g. mentioning generic practices like 'try and catch' for profiling, or imprecise definitions without deep technical terms), grade strictly: total score should be around 45-55/100, with dimensions around half marks.\n"
            f"- If an answer is inaccurate, repeated from another question, or empty, give minimal to zero credit for that question.\n"
            f"- Reserve 70+ scores strictly for clear, technically accurate explanations with appropriate domain terminology.\n"
            f"- Evaluate each dimension:\n"
            f"{dimension_instructions}"
            f"- score (integer 0-100): overall score reflecting strict technical assessment.\n"
            f"- topic_relevance (integer 0-10): how directly and appropriately candidate answered the questions.\n"
            f"- proctoring_score (integer 0-10): proctoring score based on warnings.\n"
            f"- strengths: list of 2-3 specific real strengths (note 'Basic participation' if weak).\n"
            f"- weaknesses: list of 2-4 specific technical weaknesses identified directly from the transcript.\n"
            f"- improvement_plan: list of 2-4 concrete technical study topics.\n"
            f"- recommended_topics: list of topics to review.\n"
            f"- hiring_signal: 'No Hire' (<60), 'Consider' (60-74), 'Hire' (75-89), 'Strong Hire' (90+).\n"
            f"Output strictly valid JSON with these fields."
        )

        # Check if candidate provided ANY spoken or written answers
        all_spoken_text = " ".join(
            item['spoken_answer'] for item in qa_pairs 
            if item['spoken_answer'] and item['spoken_answer'] != "(No answer provided / silence)"
        ).strip()
        all_code = " ".join(item['code_answer'] for item in qa_pairs if item['code_answer']).strip()
        has_substantive_answers = bool(all_spoken_text or all_code or (code_explanation or '').strip())

        is_disqualified = bool(disqualified or warning_count >= 3)

        if not has_substantive_answers:
            # Candidate kept quiet or provided zero answers throughout the interview
            total_score = 0
            communication = 0
            technical_depth = 0
            code_quality = 0
            optimization = 0
            problem_solving = 0
            topic_relevance = 0
            proctoring_score = 0 if is_disqualified else max(0, 10 - (warning_count * 3))
            hiring_signal = 'No Hire'
            weaknesses = ['No answers provided: Candidate remained silent and did not respond to technical questions']
            raw = {
                'score': 0,
                'total_score': 0,
                'communication': 0,
                'technical_depth': 0,
                'code_quality': 0,
                'optimization': 0,
                'problem_solving': 0,
                'topic_relevance': 0,
                'proctoring_score': proctoring_score,
                'hiring_signal': 'No Hire',
                'strengths': ['None — candidate remained silent throughout the interview'],
                'weaknesses': ['Candidate did not provide any spoken or written answers to the questions asked'],
                'improvement_plan': ['Practice speaking answers clearly and attempting every question asked'],
                'recommended_topics': session.selected_tracks or ['Technical Interview Preparation'],
                'disqualified': is_disqualified,
            }
            if is_disqualified:
                raw['disqualify_reason'] = disqualify_reason or 'Exceeded proctoring warnings (3/3)'
        elif is_disqualified:
            total_score = 0
            hiring_signal = 'No Hire'
            weaknesses = [f'Disqualified: {disqualify_reason or "Exceeded proctoring warnings (3/3)"}']
            communication = 0
            technical_depth = 0
            code_quality = 0
            optimization = 0
            problem_solving = 0
            proctoring_score = 0
            topic_relevance = 0
            raw = {
                'score': 0,
                'total_score': 0,
                'communication': 0,
                'technical_depth': 0,
                'code_quality': 0,
                'optimization': 0,
                'problem_solving': 0,
                'topic_relevance': 0,
                'proctoring_score': 0,
                'hiring_signal': 'No Hire',
                'strengths': ['Basic participation'],
                'weaknesses': weaknesses,
                'improvement_plan': ['Maintain focus on the screen and adhere to proctoring guidelines'],
                'recommended_topics': session.selected_tracks or ['Technical Fundamentals'],
                'disqualified': True,
                'disqualify_reason': disqualify_reason or 'Exceeded proctoring warnings (3/3)',
            }
        else:
            try:
                raw = await gemini_client.generate_json(prompt)
            except Exception:
                raw = {}

            # Proctor score formula: 0 warnings = 10, 1 warning = 7, 2 warnings = 4, 3+ warnings = 0
            proctoring_score = max(0, 10 - (warning_count * 3))
            
            # Topic relevance: parse from AI or default to 8
            raw_rel = raw.get('topic_relevance')
            try:
                topic_relevance = max(1, min(10, int(raw_rel))) if raw_rel is not None else 8
            except Exception:
                topic_relevance = 8

            communication = int(raw.get('communication', 11))
            technical_depth = int(raw.get('technical_depth', 11))
            code_quality = int(raw.get('code_quality', 10))
            optimization = int(raw.get('optimization', 8))
            problem_solving = int(raw.get('problem_solving', 10))
            
            computed_total = communication + technical_depth + code_quality + optimization + problem_solving
            total_score = computed_total
            hiring_signal = raw.get('hiring_signal', 'Consider' if total_score >= 60 else 'No Hire')
            weaknesses = raw.get('weaknesses', ['Explanations lacked technical depth and core engineering terminology'])

        # Explicitly enforce calculated proctoring and topic relevance scores in raw_ai_response
        raw['proctoring_score'] = proctoring_score
        raw['topic_relevance'] = topic_relevance
        raw['total_score'] = total_score
        raw['score'] = total_score
        raw['disqualified'] = is_disqualified
        if is_disqualified:
            raw['disqualify_reason'] = disqualify_reason or 'Exceeded proctoring warnings (3/3)'

        existing_eval_res = await db.execute(select(PracticeEvaluation).where(PracticeEvaluation.session_id == session.id))
        existing_eval = existing_eval_res.scalars().first()
        if existing_eval:
            existing_eval.total_score = total_score
            existing_eval.communication = communication
            existing_eval.technical_depth = technical_depth
            existing_eval.code_quality = code_quality
            existing_eval.optimization = optimization
            existing_eval.problem_solving = problem_solving
            existing_eval.strengths = raw.get('strengths', ['Attempted verbal responses'])
            existing_eval.weaknesses = weaknesses
            existing_eval.improvement_plan = raw.get('improvement_plan', ['Review core fundamentals and documentation'])
            existing_eval.recommended_topics = raw.get('recommended_topics', session.selected_tracks or [])
            existing_eval.hiring_signal = hiring_signal
            existing_eval.raw_ai_response = raw
            evaluation = existing_eval
        else:
            evaluation = PracticeEvaluation(
                session_id=session.id,
                total_score=total_score,
                communication=communication,
                technical_depth=technical_depth,
                code_quality=code_quality,
                optimization=optimization,
                problem_solving=problem_solving,
                strengths=raw.get('strengths', ['Attempted verbal responses']),
                weaknesses=weaknesses,
                improvement_plan=raw.get('improvement_plan', ['Review core fundamentals and documentation']),
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
