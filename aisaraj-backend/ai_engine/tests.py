"""Test cases for AI engine."""
from django.test import TestCase
from ai_engine.evaluator import normalize_and_validate


class EvaluatorTests(TestCase):
    def test_clamping_scores(self):
        raw = {
            'communication': 30,       # max 20 → clamped
            'technical_depth': 25,
            'code_quality': 20,
            'optimization': 15,
            'problem_solving': 20,
            'strengths': ['good'],
            'weaknesses': ['bad'],
            'improvement_plan': [],
            'recommended_topics': [],
            'hiring_signal': 'Hire',
        }
        result = normalize_and_validate(raw)
        self.assertEqual(result['communication'], 20)
        self.assertEqual(result['score'], 100)
        self.assertEqual(result['hiring_signal'], 'Strong Hire')

    def test_negative_scores_clamped_to_zero(self):
        raw = {
            'communication': -5,
            'technical_depth': 0,
            'code_quality': 0,
            'optimization': 0,
            'problem_solving': 0,
            'strengths': [],
            'weaknesses': [],
            'improvement_plan': [],
            'recommended_topics': [],
            'hiring_signal': 'Hire',
        }
        result = normalize_and_validate(raw)
        self.assertEqual(result['communication'], 0)
        self.assertEqual(result['score'], 0)
        self.assertEqual(result['hiring_signal'], 'Reject')

    def test_hiring_signal_thresholds(self):
        base = {
            'strengths': [], 'weaknesses': [],
            'improvement_plan': [], 'recommended_topics': [],
            'hiring_signal': '',
        }

        # Score 90 → Strong Hire
        raw = {**base, 'communication': 18, 'technical_depth': 22,
               'code_quality': 18, 'optimization': 14, 'problem_solving': 18}
        self.assertEqual(normalize_and_validate(raw)['hiring_signal'], 'Strong Hire')

        # Score 72 → Hire
        raw = {**base, 'communication': 14, 'technical_depth': 18,
               'code_quality': 14, 'optimization': 12, 'problem_solving': 14}
        self.assertEqual(normalize_and_validate(raw)['hiring_signal'], 'Hire')

        # Score 52 → Consider
        raw = {**base, 'communication': 10, 'technical_depth': 13,
               'code_quality': 10, 'optimization': 8, 'problem_solving': 11}
        self.assertEqual(normalize_and_validate(raw)['hiring_signal'], 'Consider')

    def test_missing_list_fields_defaulted(self):
        raw = {
            'communication': 10, 'technical_depth': 10,
            'code_quality': 10, 'optimization': 10, 'problem_solving': 10,
            'hiring_signal': '',
        }
        result = normalize_and_validate(raw)
        self.assertIsInstance(result['strengths'], list)
        self.assertIsInstance(result['weaknesses'], list)
        self.assertIsInstance(result['skill_gap_analysis'], dict)
