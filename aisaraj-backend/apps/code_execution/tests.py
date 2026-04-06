"""Test cases for code execution sandbox service."""
from django.test import TestCase
from apps.code_execution.services import SandboxService, SUPPORTED_LANGUAGES


class SandboxServiceTests(TestCase):
    def test_supported_languages(self):
        self.assertIn('python', SUPPORTED_LANGUAGES)
        self.assertIn('javascript', SUPPORTED_LANGUAGES)
        self.assertIn('cpp', SUPPORTED_LANGUAGES)
        self.assertIn('java', SUPPORTED_LANGUAGES)

    def test_unsupported_language_returns_error(self):
        service = SandboxService()
        result = service.execute('rust', 'fn main() {}')
        self.assertEqual(result['exit_code'], 1)
        self.assertIn('Unsupported language', result['stderr'])
