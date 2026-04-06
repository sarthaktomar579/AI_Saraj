"""Gemini API client wrapper."""
import json
import logging
import re
from django.conf import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self):
        self.model = None
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key or api_key == 'your-gemini-api-key':
            logger.warning('GEMINI_API_KEY not configured — using mock responses.')
            return
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception as e:
            logger.error('Failed to initialize Gemini: %s', e)

    def generate_json(self, prompt: str) -> dict:
        """Send prompt to Gemini and parse the JSON response."""
        if not self.model:
            return self._mock_response(prompt)
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
                text = text.rsplit('```', 1)[0]
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error('Failed to parse Gemini JSON: %s | Response: %s', e, text[:500])
            return self._mock_response(prompt)
        except Exception as e:
            logger.exception('Gemini API error: %s', e)
            return self._mock_response(prompt)

    def _mock_response(self, prompt: str) -> dict:
        """Return a mock response when Gemini is unavailable."""
        p = prompt.lower()

        # Comprehensive evaluation
        if 'proctoring' in p and ('score' in p or 'evaluate' in p):
            return {
                'score': 68,
                'communication': 14, 'technical_depth': 17,
                'code_quality': 14, 'optimization': 10, 'problem_solving': 13,
                'topic_relevance': 7, 'proctoring_score': 9,
                'strengths': ['Solid understanding of chosen topics', 'Clear verbal communication'],
                'weaknesses': ['Code optimization needs work', 'Handle edge cases better'],
                'improvement_plan': ['Practice LeetCode medium daily', 'Study time complexity'],
                'recommended_topics': ['Dynamic Programming', 'System Design'],
                'hiring_signal': 'Consider',
                'detailed_feedback': 'Good understanding of their projects. Code solution was correct but lacked optimization. Communication was clear and confident.',
                'warning_count': 0,
            }

        # Acknowledge / respond to answer
        if 'acknowledge' in p or 'candidate just answered' in p:
            return {
                'response': 'Good answer! That shows solid understanding of your project.',
                'candidate_asked_question': False,
                'answer_quality': 'good',
            }

        # Track-based verbal questions
        if 'selected tracks' in p and 'requested question count' in p:
            tracks_match = re.search(r"selected tracks:\s*(.+?)\n\nselected subcategories:", p, re.DOTALL)
            tracks = []
            if tracks_match:
                tracks = [t.strip() for t in tracks_match.group(1).split(',') if t.strip() and t.strip() != 'dsa']
            sub_map = {}
            sub_match = re.search(r"selected subcategories:\s*(.+?)\n\ndifficulty:", p, re.DOTALL)
            if sub_match:
                raw_subs = sub_match.group(1)
                for track in tracks:
                    vals = re.findall(rf"['\"]{re.escape(track)}['\"]\s*:\s*\[(.*?)\]", raw_subs)
                    if vals:
                        subs = [s.strip().strip("'\" ") for s in vals[0].split(',') if s.strip()]
                        sub_map[track] = [s for s in subs if s]

            question_templates = [
                "In {track} ({sub}), explain an architecture decision you made and why.",
                "In {track} ({sub}), how do you debug production issues efficiently?",
                "In {track} ({sub}), what trade-offs would you make between performance and maintainability?",
                "In {track} ({sub}), describe a failure scenario and your mitigation strategy.",
                "In {track} ({sub}), how would you design this for scale and reliability?",
            ]
            generated = []
            for track in tracks:
                subs = sub_map.get(track) or ['general']
                for sub in subs:
                    template = question_templates[len(generated) % len(question_templates)]
                    generated.append({
                        'question_text': template.format(track=track, sub=sub),
                        'question_type': 'verbal',
                        'difficulty_level': 'medium',
                        'track': track,
                        'subcategory': sub,
                    })
            if not generated:
                generated.append({
                    'question_text': 'Describe a technical challenge you solved recently and your trade-offs.',
                    'question_type': 'verbal',
                    'difficulty_level': 'medium',
                    'track': 'general',
                    'subcategory': 'general',
                })
            return {
                'questions': generated,
            }

        # LeetCode coding question
        if 'leetcode' in p or ('coding' in p and 'problem' in p):
            return {
                'question_text': 'Two Sum\n\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9\n\nExample 2:\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n\nConstraints:\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- Only one valid answer exists.',
                'question_type': 'coding',
                'difficulty_level': 'easy',
                'problem_name': 'Two Sum',
                'expected_time_minutes': 15,
                'hints': ['Use a hash map', 'One-pass solution exists'],
                'expected_complexity': 'O(n)',
            }

        # Default
        return {
            'question_text': 'Tell me about your most significant project.',
            'question_type': 'verbal',
            'difficulty_level': 'medium',
        }
