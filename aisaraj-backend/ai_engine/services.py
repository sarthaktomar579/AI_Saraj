"""AIEngineService — orchestrates Gemini calls for question generation and evaluation."""
import logging
from .client import GeminiClient
from .prompts.practice import (
    TRACK_BASED_QUESTIONS, LEETCODE_QUESTION,
    COMPREHENSIVE_EVALUATION, ACKNOWLEDGE_AND_RESPOND,
)

logger = logging.getLogger(__name__)


class AIEngineService:
    def __init__(self):
        self.client = GeminiClient()

    def generate_track_questions(self, selected_tracks: list, selected_subcategories: dict,
                                 difficulty: str, question_count: int = 8) -> list:
        """Generate verbal questions from selected tracks/subcategories."""
        prompt = TRACK_BASED_QUESTIONS.format(
            selected_tracks=', '.join(selected_tracks),
            selected_subcategories=selected_subcategories,
            difficulty=difficulty,
            question_count=question_count,
        )
        result = self.client.generate_json(prompt)
        return result.get('questions', [])

    def acknowledge_answer(self, question: str, answer: str) -> dict:
        """Generate a brief acknowledgment of the candidate's answer."""
        prompt = ACKNOWLEDGE_AND_RESPOND.format(question=question[:500], answer=answer[:1000])
        return self.client.generate_json(prompt)

    def generate_leetcode_question(self, topic: str, difficulty: str, dsa_subcategories: list | None = None) -> dict:
        """Generate a LeetCode-style coding question."""
        prompt = LEETCODE_QUESTION.format(
            topic=topic,
            difficulty=difficulty,
            dsa_subcategories=', '.join(dsa_subcategories or []),
        )
        return self.client.generate_json(prompt)

    def evaluate_comprehensive(self, selected_tracks: list, selected_subcategories: dict, verbal_transcript: str,
                                coding_problem: str, code_solution: str,
                                code_explanation: str, language: str,
                                warning_count: int) -> dict:
        """Full evaluation including resume Q&A, coding, and proctoring."""
        prompt = COMPREHENSIVE_EVALUATION.format(
            selected_tracks=', '.join(selected_tracks),
            selected_subcategories=selected_subcategories,
            verbal_transcript=verbal_transcript[:3000],
            coding_problem=coding_problem[:1000],
            code_solution=code_solution[:2000],
            code_explanation=code_explanation[:1000],
            language=language,
            warning_count=warning_count,
        )
        raw = self.client.generate_json(prompt)
        return self._normalize_comprehensive(raw, warning_count)

    def _normalize_comprehensive(self, raw: dict, warning_count: int) -> dict:
        dims = {
            'communication': 20, 'technical_depth': 25,
            'code_quality': 20, 'optimization': 15, 'problem_solving': 20,
        }
        for key, cap in dims.items():
            raw[key] = max(0, min(cap, int(raw.get(key, 0))))

        raw['topic_relevance'] = max(0, min(10, int(raw.get('topic_relevance', 7))))
        raw['proctoring_score'] = max(0, min(10, 10 - warning_count))
        raw['warning_count'] = warning_count
        raw['score'] = sum(raw.get(k, 0) for k in dims)
        raw.setdefault('strengths', [])
        raw.setdefault('weaknesses', [])
        raw.setdefault('improvement_plan', [])
        raw.setdefault('recommended_topics', [])
        raw.setdefault('detailed_feedback', '')

        total = raw['score']
        if total >= 85:
            raw['hiring_signal'] = 'Strong Hire'
        elif total >= 70:
            raw['hiring_signal'] = 'Hire'
        elif total >= 50:
            raw['hiring_signal'] = 'Consider'
        else:
            raw['hiring_signal'] = 'Reject'

        return raw
