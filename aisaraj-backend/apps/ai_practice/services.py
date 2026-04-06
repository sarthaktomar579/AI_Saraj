"""AI Practice service layer — track-based interview orchestration."""
import logging
import random
from django.utils import timezone
from ai_engine.services import AIEngineService
from apps.code_execution.services import SandboxService
from .models import PracticeSession, AIQuestion, AIAnswer, PracticeEvaluation
from .dsa_prompts import get_full_prompt
from .verbal_question_bank import get_verbal_questions_for_tracks

logger = logging.getLogger(__name__)


class PracticeService:
    def __init__(self):
        self.ai_engine = AIEngineService()
        self.sandbox = SandboxService()

    def start_session(
        self,
        student,
        topic,
        difficulty,
        selected_tracks=None,
        selected_subcategories=None,
        session_type='practice',
        scheduled_interview_id=None,
    ):
        return PracticeSession.objects.create(
            student=student,
            topic=topic,
            difficulty=difficulty,
            selected_tracks=selected_tracks or [],
            selected_subcategories=selected_subcategories or {},
            session_type=session_type or 'practice',
            scheduled_interview_id=scheduled_interview_id,
            status='active',
        )

    def create_track_questions(self, session, question_count=8):
        """Generate varied verbal questions from selected interview tracks.

        DSA verbal questions are intentionally excluded; DSA is handled via coding round.
        """
        selected_tracks = [t.lower() for t in (session.selected_tracks or []) if t.lower() != 'dsa']
        selected_subcategories = session.selected_subcategories or {}
        if not selected_tracks:
            return []

        # Keep AI service initialized for acknowledgments/evaluation, but use local memory bank
        # for consistent topic coverage and higher variety.
        ai_questions = []
        questions_data = self._normalize_track_questions(
            session=session,
            questions_data=ai_questions,
            selected_tracks=selected_tracks,
            selected_subcategories=selected_subcategories,
            difficulty=session.difficulty,
            question_count=question_count,
        )
        questions = []
        for i, q_data in enumerate(questions_data[:question_count]):
            question = AIQuestion.objects.create(
                session=session,
                question_text=q_data.get('question_text', 'Tell me about your approach to this topic.'),
                difficulty_level=q_data.get('difficulty_level', 'medium'),
                question_type='verbal',
                order=i,
            )
            questions.append(question)

        session.current_q_index = 0
        session.save()
        return questions

    def _normalize_track_questions(self, session, questions_data, selected_tracks, selected_subcategories, difficulty, question_count):
        """Ensure generated questions match the selected tracks/subcategories."""
        selected_track_set = {t.lower() for t in selected_tracks}
        selected_sub_map = {
            k.lower(): [s.lower() for s in (v or [])]
            for k, v in (selected_subcategories or {}).items()
        }
        recent_used_texts = self._get_recent_used_question_texts(session, limit=60)
        normalized = []
        seen = set()
        for q in questions_data or []:
            track = str(q.get('track', '')).strip().lower()
            subcategory = str(q.get('subcategory', '')).strip().lower()
            text = str(q.get('question_text', '')).strip()
            if track and track not in selected_track_set:
                continue
            if track in selected_sub_map and selected_sub_map[track]:
                if subcategory and subcategory not in selected_sub_map[track]:
                    continue
            if not text:
                continue
            text_key = text.lower()
            if text_key in seen:
                continue
            if text_key in recent_used_texts:
                continue
            seen.add(text_key)
            normalized.append(q)

        fallback_pool = self._build_fallback_pool(selected_tracks, selected_sub_map, difficulty)
        random.shuffle(fallback_pool)

        idx = 0
        while len(normalized) < question_count and fallback_pool:
            candidate = fallback_pool[idx % len(fallback_pool)]
            text_key = candidate['question_text'].lower()
            if text_key not in seen and text_key not in recent_used_texts:
                normalized.append(candidate)
                seen.add(text_key)
            idx += 1
            if idx > len(fallback_pool) * 3:
                break

        if len(normalized) < question_count:
            idx = 0
            while len(normalized) < question_count and fallback_pool:
                candidate = fallback_pool[idx % len(fallback_pool)]
                text_key = candidate['question_text'].lower()
                if text_key not in seen:
                    normalized.append(candidate)
                    seen.add(text_key)
                idx += 1
                if idx > len(fallback_pool) * 2:
                    break

        return normalized[:question_count]

    def _get_recent_used_question_texts(self, session, limit=60):
        questions = (
            AIQuestion.objects.filter(
                session__student=session.student,
                question_type='verbal',
            )
            .exclude(session=session)
            .order_by('-id')[:limit]
        )
        return {q.question_text.strip().lower() for q in questions if q.question_text}

    def _build_fallback_pool(self, selected_tracks, selected_sub_map, difficulty):
        pool = get_verbal_questions_for_tracks(selected_tracks, selected_sub_map)
        for item in pool:
            item['difficulty_level'] = difficulty
        return pool

    def acknowledge_answer(self, session, question_id, answer_text):
        """Generate AI acknowledgment of candidate's answer and save the spoken text."""
        question = AIQuestion.objects.get(id=question_id, session=session)
        cleaned = (answer_text or '').strip()

        AIAnswer.objects.update_or_create(
            question=question,
            defaults={'text_answer': cleaned},
        )

        if not cleaned:
            return {
                'response': 'No answer detected for this question. Let us move to the next one.',
                'candidate_asked_question': False,
                'answer_quality': 'no_answer',
            }
        result = self.ai_engine.acknowledge_answer(
            question=question.question_text,
            answer=cleaned,
        )
        return result

    def generate_leetcode(self, session):
        dsa_subcategories = session.selected_subcategories.get('dsa', []) if session.selected_subcategories else []
        q_data = self._pick_random_dsa_question(session, dsa_subcategories, session.difficulty)
        question = AIQuestion.objects.create(
            session=session,
            question_text=q_data.get('question_text', 'Solve this coding problem.'),
            difficulty_level=q_data.get('difficulty_level', session.difficulty),
            question_type='coding',
            order=session.current_q_index,
        )
        session.current_q_index += 1
        session.save()
        return question

    def _pick_random_dsa_question(self, session, dsa_subcategories, difficulty):
        bank = self._dsa_question_bank()
        recent = self._get_recent_dsa_problem_names(session, limit=50)
        allowed_subs = {s.lower() for s in (dsa_subcategories or [])}
        candidates = []
        for item in bank:
            if allowed_subs and item['subcategory'].lower() not in allowed_subs:
                continue
            if item['problem_name'].lower() in recent:
                continue
            candidates.append(item)
        if not candidates:
            candidates = [q for q in bank if not allowed_subs or q['subcategory'].lower() in allowed_subs] or bank
        chosen = random.choice(candidates)
        result = dict(chosen)
        result['difficulty_level'] = difficulty
        result['question_type'] = 'coding'
        return result

    def _get_recent_dsa_problem_names(self, session, limit=50):
        questions = (
            AIQuestion.objects.filter(session__student=session.student, question_type='coding')
            .exclude(session=session)
            .order_by('-id')[:limit]
        )
        names = set()
        for q in questions:
            text = (q.question_text or '').strip().lower()
            if not text:
                continue
            first_line = text.split('\n', 1)[0].strip()
            if first_line:
                names.add(first_line)
        return names

    def _dsa_question_bank(self):
        # 50 most-asked style DSA problems, compact statements for interview use.
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
            ('Encode and Decode Strings', 'Strings'),
            ('Reverse Linked List', 'Linked List'),
            ('Linked List Cycle', 'Linked List'),
            ('Merge Two Sorted Lists', 'Linked List'),
            ('Remove Nth Node From End of List', 'Linked List'),
            ('Reorder List', 'Linked List'),
            ('Merge K Sorted Lists', 'Linked List'),
            ('Binary Tree Inorder Traversal', 'Trees'),
            ('Maximum Depth of Binary Tree', 'Trees'),
            ('Same Tree', 'Trees'),
            ('Invert Binary Tree', 'Trees'),
            ('Binary Tree Level Order Traversal', 'Trees'),
            ('Validate Binary Search Tree', 'Trees'),
            ('Kth Smallest Element in a BST', 'Trees'),
            ('Lowest Common Ancestor of a BST', 'Trees'),
            ('Subtree of Another Tree', 'Trees'),
            ('Construct Binary Tree from Preorder and Inorder', 'Trees'),
            ('Number of Islands', 'Graphs'),
            ('Clone Graph', 'Graphs'),
            ('Pacific Atlantic Water Flow', 'Graphs'),
            ('Course Schedule', 'Graphs'),
            ('Course Schedule II', 'Graphs'),
            ('Graph Valid Tree', 'Graphs'),
            ('Redundant Connection', 'Graphs'),
            ('Unique Paths', 'DP'),
            ('Climbing Stairs', 'DP'),
            ('House Robber', 'DP'),
            ('House Robber II', 'DP'),
            ('Coin Change', 'DP'),
            ('Longest Increasing Subsequence', 'DP'),
            ('Partition Equal Subset Sum', 'DP'),
            ('Word Break', 'DP'),
        ]
        bank = []
        for idx, (name, sub) in enumerate(names, start=1):
            prompt = get_full_prompt(name, sub, idx)
            bank.append({
                'problem_name': name,
                'subcategory': sub,
                'question_text': prompt,
                'hints': ['Start from brute force and optimize', 'Consider hash map / two pointers / DP as appropriate'],
                'expected_complexity': 'Optimized interview-grade complexity',
                'expected_time_minutes': 15,
            })
        return bank

    def submit_answer(self, session, question_id, text_answer='', code_answer='', language=''):
        question = AIQuestion.objects.get(id=question_id, session=session)
        execution_result = None
        if code_answer and language:
            execution_result = self.sandbox.execute(language, code_answer)
        answer, _ = AIAnswer.objects.update_or_create(
            question=question,
            defaults={
                'text_answer': text_answer,
                'code_answer': code_answer,
                'language': language,
                'execution_result': execution_result,
            },
        )
        return answer

    def evaluate_comprehensive(self, session, code_explanation='', warning_count=0, disqualified=False, disqualify_reason=''):
        verbal_transcript = self._build_verbal_transcript(session)
        coding_q, code_solution, language = self._get_coding_data(session)

        raw = self.ai_engine.evaluate_comprehensive(
            selected_tracks=session.selected_tracks or [],
            selected_subcategories=session.selected_subcategories or {},
            verbal_transcript=verbal_transcript,
            coding_problem=coding_q,
            code_solution=code_solution,
            code_explanation=code_explanation,
            language=language,
            warning_count=warning_count,
        )
        raw = self._apply_answer_coverage_penalty(raw, session)
        raw = self._apply_coding_coverage_penalty(raw, code_solution, code_explanation)
        raw = self._apply_zero_if_no_participation(raw, session, code_solution, code_explanation)
        raw = self._apply_zero_if_missing_required_code(raw, session, code_solution)
        if disqualified:
            raw = self._apply_disqualification(raw, disqualify_reason or 'Proctoring policy violation')

        evaluation = PracticeEvaluation.objects.create(
            session=session,
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
            hiring_signal=raw.get('hiring_signal', 'Consider'),
            raw_ai_response=raw,
        )
        session.status = 'completed'
        session.completed_at = timezone.now()
        session.save()
        return evaluation

    def _apply_answer_coverage_penalty(self, raw, session):
        verbal_questions = list(session.questions.filter(question_type='verbal'))
        if not verbal_questions:
            return raw

        answered = 0
        for q in verbal_questions:
            try:
                ans = (q.answer.text_answer or '').strip()
                if self._is_real_answer(ans):
                    answered += 1
            except Exception:
                pass

        total = len(verbal_questions)
        ratio = answered / total if total else 0
        raw['answered_questions'] = answered
        raw['total_verbal_questions'] = total
        raw['answer_coverage_ratio'] = round(ratio, 2)

        if ratio < 1.0:
            for key in ('communication', 'technical_depth', 'problem_solving', 'topic_relevance'):
                if key in raw:
                    raw[key] = int(raw[key] * ratio)
            if ratio <= 0.2:
                raw['hiring_signal'] = 'Reject'
                raw['strengths'] = []
            feedback = raw.get('detailed_feedback', '')
            suffix = f' Only {answered} out of {total} verbal questions were answered.'
            raw['detailed_feedback'] = f'{feedback}{suffix}'.strip()
            if ratio <= 0.3:
                weaknesses = raw.get('weaknesses', [])
                weaknesses.append('Low response coverage across verbal interview questions')
                raw['weaknesses'] = weaknesses

            raw['score'] = int(
                raw.get('communication', 0)
                + raw.get('technical_depth', 0)
                + raw.get('code_quality', 0)
                + raw.get('optimization', 0)
                + raw.get('problem_solving', 0)
            )

        return raw

    def _is_real_answer(self, text):
        t = (text or '').strip()
        if not t:
            return False
        lowered = t.lower()
        fillers = {'hmm', 'uh', 'umm', 'no', 'nothing', 'skip', 'pass', 'idk', 'dont know', "don't know"}
        if lowered in fillers:
            return False
        alpha_chars = sum(1 for ch in t if ch.isalpha())
        words = [w for w in t.replace('\n', ' ').split(' ') if w.strip()]
        return alpha_chars >= 20 and len(words) >= 4

    def _is_real_code(self, code, language='python'):
        """Check if the submitted code is a genuine attempt, not random text."""
        c = (code or '').strip()
        if not c:
            return False
        if len(c) < 15:
            return False
        code_indicators = [
            'def ', 'class ', 'return ', 'import ', 'for ', 'while ', 'if ',
            'function ', 'const ', 'let ', 'var ', 'console.',
            'public ', 'private ', 'static ', 'void ', 'int ',
            '#include', 'using namespace', 'cout', 'cin',
            'print(', 'print (', 'System.out', 'printf',
            '= ', '==', '!=', '<=', '>=', '+=', '-=',
            'for(', 'while(', 'if(',
        ]
        lowered = c.lower()
        matches = sum(1 for ind in code_indicators if ind.lower() in lowered)
        lines = [ln.strip() for ln in c.split('\n') if ln.strip()]
        return matches >= 2 and len(lines) >= 3

    def _apply_coding_coverage_penalty(self, raw, code_solution, code_explanation):
        code_ok = self._is_real_code(code_solution)
        explain_ok = self._is_real_answer(code_explanation or '')
        if code_ok and explain_ok:
            return raw
        if not code_ok:
            raw['code_quality'] = 0
            raw['optimization'] = 0
            raw['problem_solving'] = min(raw.get('problem_solving', 0), 3)
            weaknesses = raw.get('weaknesses', [])
            if (code_solution or '').strip():
                weaknesses.append('Submitted code does not appear to be a genuine solution attempt')
            else:
                weaknesses.append('No coding submission provided')
            raw['weaknesses'] = weaknesses
        if not explain_ok:
            raw['communication'] = min(raw.get('communication', 0), 4)
            raw['technical_depth'] = min(raw.get('technical_depth', 0), 5)
        raw['score'] = int(
            raw.get('communication', 0)
            + raw.get('technical_depth', 0)
            + raw.get('code_quality', 0)
            + raw.get('optimization', 0)
            + raw.get('problem_solving', 0)
        )
        if not code_ok and not explain_ok:
            raw['hiring_signal'] = 'Reject'
            raw['strengths'] = []
            raw['detailed_feedback'] = 'No valid coding solution or explanation was captured.'
        return raw

    def _apply_zero_if_no_participation(self, raw, session, code_solution, code_explanation):
        verbal_questions = list(session.questions.filter(question_type='verbal'))
        answered = 0
        for q in verbal_questions:
            try:
                if self._is_real_answer((q.answer.text_answer or '').strip()):
                    answered += 1
            except Exception:
                pass
        code_ok = self._is_real_code(code_solution)
        explain_ok = self._is_real_answer(code_explanation or '')
        if answered == 0 and not code_ok and not explain_ok:
            raw['communication'] = 0
            raw['technical_depth'] = 0
            raw['code_quality'] = 0
            raw['optimization'] = 0
            raw['problem_solving'] = 0
            raw['topic_relevance'] = 0
            raw['score'] = 0
            raw['hiring_signal'] = 'Reject'
            raw['strengths'] = []
            raw['weaknesses'] = ['No valid participation detected in interview or coding rounds']
            raw['detailed_feedback'] = 'No valid answer/code/explanation was captured. Score is 0 by policy.'
        return raw

    def _apply_zero_if_missing_required_code(self, raw, session, code_solution):
        has_coding_q = session.questions.filter(question_type='coding').exists()
        if not has_coding_q:
            return raw
        if self._is_real_code(code_solution):
            return raw
        raw['communication'] = 0
        raw['technical_depth'] = 0
        raw['code_quality'] = 0
        raw['optimization'] = 0
        raw['problem_solving'] = 0
        raw['topic_relevance'] = 0
        raw['score'] = 0
        raw['hiring_signal'] = 'Reject'
        raw['strengths'] = []
        if (code_solution or '').strip():
            raw['weaknesses'] = ['Submitted code is not a valid solution attempt for the coding round']
        else:
            raw['weaknesses'] = ['No coding submission was provided for mandatory coding round']
        raw['detailed_feedback'] = 'No valid coding solution was submitted. Score is 0 by policy.'
        return raw

    def _apply_disqualification(self, raw, reason):
        raw['communication'] = 0
        raw['technical_depth'] = 0
        raw['code_quality'] = 0
        raw['optimization'] = 0
        raw['problem_solving'] = 0
        raw['topic_relevance'] = 0
        raw['score'] = 0
        raw['hiring_signal'] = 'Reject'
        raw['disqualified'] = True
        raw['disqualify_reason'] = reason
        feedback = raw.get('detailed_feedback', '')
        raw['detailed_feedback'] = f'{feedback} Candidate was disqualified: {reason}.'.strip()
        return raw

    def _build_verbal_transcript(self, session):
        lines = []
        for q in session.questions.filter(question_type='verbal').order_by('order'):
            lines.append(f'Q: {q.question_text}')
            try:
                a = q.answer
                text = (a.text_answer or '').strip()
                if text:
                    lines.append(f'A: {text}')
                else:
                    lines.append('A: (candidate gave no answer / was silent)')
            except Exception:
                lines.append('A: (candidate gave no answer / was silent)')
        return '\n'.join(lines)

    def _get_coding_data(self, session):
        coding_q = session.questions.filter(question_type='coding').first()
        if not coding_q:
            return '', '', 'python'
        try:
            a = coding_q.answer
            return coding_q.question_text, a.code_answer or '', a.language or 'python'
        except Exception:
            return coding_q.question_text, '', 'python'
