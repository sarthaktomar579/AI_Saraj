import json
import logging
import re
from core.config import settings

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self):
        self.model = None
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == 'your-gemini-api-key':
            logger.warning('GEMINI_API_KEY not configured — using mock responses.')
            return
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-3.7-flash')
        except Exception as e:
            logger.error('Failed to initialize Gemini: %s', e)

    async def generate_json(self, prompt: str) -> dict:
        """Send prompt to Gemini and parse the JSON response."""
        if not self.model:
            return self._mock_response(prompt)
        try:
            # Running synchronous generate_content in async context might block, 
            # ideally should use await model.generate_content_async if available
            response = await self.model.generate_content_async(prompt)
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
        # Same mock response logic as Django
        return {
            'question_text': 'Tell me about your most significant project.',
            'question_type': 'verbal',
            'difficulty_level': 'medium',
        }

gemini_client = GeminiClient()
