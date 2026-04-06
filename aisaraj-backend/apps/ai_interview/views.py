"""AI Interview views."""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from apps.accounts.permissions import IsStudent, IsInterviewer
from apps.accounts.models import User
from .models import AIScheduledInterview, AIInterviewReport
from .serializers import (
    AIInterviewCreateSerializer, AIInterviewListSerializer,
    AIInterviewDetailSerializer, AIInterviewQuestionSerializer,
    AIInterviewAnswerSerializer, AIInterviewReportSerializer,
)
from .services import AIInterviewService


class AIInterviewCreateView(generics.CreateAPIView):
    serializer_class = AIInterviewCreateSerializer
    permission_classes = [IsAuthenticated, IsInterviewer]

    def perform_create(self, serializer):
        service = AIInterviewService()
        interview = service.schedule(
            interviewer=self.request.user,
            student=serializer.validated_data['student'],
            topic=serializer.validated_data['topic'],
            difficulty=serializer.validated_data['difficulty'],
            scheduled_at=serializer.validated_data['scheduled_at'],
            deadline=serializer.validated_data.get('deadline'),
            company_name=serializer.validated_data.get('company_name', ''),
            selected_tracks=serializer.validated_data.get('selected_tracks', []),
            selected_subcategories=serializer.validated_data.get('selected_subcategories', {}),
        )
        serializer.instance = interview


class AIInterviewListView(generics.ListAPIView):
    serializer_class = AIInterviewListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return AIScheduledInterview.objects.filter(
            Q(interviewer=user) | Q(student=user)
        ).select_related('interviewer', 'student')


class AIInterviewDetailView(generics.RetrieveAPIView):
    serializer_class = AIInterviewDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = AIScheduledInterview.objects.all()


class StudentListView(APIView):
    """Interviewer can list students to schedule interviews for."""
    permission_classes = [IsAuthenticated, IsInterviewer]

    def get(self, request):
        students = User.objects.filter(role='student').values('id', 'username', 'first_name', 'last_name', 'email')
        return Response(list(students))


class StartInterviewView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def patch(self, request, pk):
        interview = get_object_or_404(AIScheduledInterview, pk=pk, student=request.user)
        service = AIInterviewService()
        service.start(interview)
        return Response({'status': 'in_progress'})


class NextQuestionView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        interview = get_object_or_404(AIScheduledInterview, pk=pk, student=request.user, status='in_progress')
        service = AIInterviewService()
        question = service.get_next_question(interview)
        return Response(AIInterviewQuestionSerializer(question).data)


class SubmitAnswerView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        interview = get_object_or_404(AIScheduledInterview, pk=pk, student=request.user, status='in_progress')
        serializer = AIInterviewAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = AIInterviewService()
        service.submit_answer(interview, **serializer.validated_data)
        return Response({'status': 'submitted'})


class UploadRecordingView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        interview = get_object_or_404(AIScheduledInterview, pk=pk, student=request.user)
        file = request.FILES.get('recording')
        if not file:
            return Response({'error': 'No recording file'}, status=status.HTTP_400_BAD_REQUEST)
        service = AIInterviewService()
        url = service.upload_recording(interview, file)
        return Response({'recording_url': url})


class CompleteInterviewView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        interview = get_object_or_404(AIScheduledInterview, pk=pk, student=request.user, status='in_progress')
        service = AIInterviewService()
        report = service.complete(interview)
        return Response(AIInterviewReportSerializer(report).data)


class SaveReportView(APIView):
    """Accept evaluation data from the practice session flow and save as AIInterviewReport."""
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        interview = get_object_or_404(AIScheduledInterview, pk=pk, student=request.user)
        d = request.data
        fields = dict(
            total_score=d.get('total_score', 0),
            communication=d.get('communication', 0),
            technical_depth=d.get('technical_depth', 0),
            code_quality=d.get('code_quality', 0),
            optimization=d.get('optimization', 0),
            problem_solving=d.get('problem_solving', 0),
            warning_count=d.get('warning_count', 0),
            disqualified=d.get('disqualified', False),
            disqualify_reason=d.get('disqualify_reason', ''),
            strengths=d.get('strengths', []),
            weaknesses=d.get('weaknesses', []),
            improvement_plan=d.get('improvement_plan', []),
            recommended_topics=d.get('recommended_topics', []),
            hiring_signal=d.get('hiring_signal', 'uncertain'),
            skill_gap_analysis=d.get('skill_gap_analysis', {}),
            raw_ai_response=d.get('raw_ai_response', d),
        )
        report, created = AIInterviewReport.objects.update_or_create(
            interview=interview, defaults=fields,
        )
        interview.status = 'completed'
        interview.save()
        resp_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(AIInterviewReportSerializer(report).data, status=resp_status)


class ReportView(APIView):
    permission_classes = [IsAuthenticated, IsInterviewer]

    def get(self, request, pk):
        interview = get_object_or_404(AIScheduledInterview, pk=pk)
        if hasattr(interview, 'report'):
            return Response(AIInterviewReportSerializer(interview.report).data)
        return Response({'detail': 'No report yet'}, status=status.HTTP_404_NOT_FOUND)
