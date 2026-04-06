"""Code execution views."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status as http_status

from .services import SandboxService, SUPPORTED_LANGUAGES


class ExecuteCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        language = request.data.get('language', '')
        source_code = request.data.get('source_code', '')
        stdin = request.data.get('stdin', '')

        if not language or not source_code:
            return Response(
                {'error': 'language and source_code are required'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        service = SandboxService()
        result = service.execute(language, source_code, stdin)
        return Response(result)


class LanguagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'languages': SUPPORTED_LANGUAGES})
