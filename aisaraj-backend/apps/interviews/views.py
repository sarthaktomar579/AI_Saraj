"""Interview views."""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from apps.accounts.permissions import IsInterviewer, IsInterviewParticipant
from .models import Interview
from .serializers import (
    InterviewCreateSerializer, InterviewListSerializer,
    InterviewDetailSerializer, FeedbackSerializer, CodeSubmissionSerializer,
)
from .services import InterviewService


class InterviewCreateView(generics.CreateAPIView):
    serializer_class = InterviewCreateSerializer
    permission_classes = [IsAuthenticated, IsInterviewer]

    def perform_create(self, serializer):
        service = InterviewService()
        interview = service.schedule(
            interviewer=self.request.user,
            student=serializer.validated_data['student'],
            title=serializer.validated_data['title'],
            scheduled_at=serializer.validated_data['scheduled_at'],
            description=serializer.validated_data.get('description', ''),
            duration_min=serializer.validated_data.get('duration_min', 60),
        )
        serializer.instance = interview


class InterviewListView(generics.ListAPIView):
    serializer_class = InterviewListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Interview.objects.filter(
            Q(interviewer=user) | Q(student=user)
        ).select_related('interviewer', 'student')


class InterviewDetailView(generics.RetrieveAPIView):
    serializer_class = InterviewDetailSerializer
    permission_classes = [IsAuthenticated, IsInterviewParticipant]
    queryset = Interview.objects.all()


class VideoTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        interview = get_object_or_404(Interview, pk=pk)
        self.check_object_permissions(request, interview)
        service = InterviewService()
        token = service.get_video_token(request.user, interview)
        return Response({'token': token, 'call_id': interview.video_call_id})


class FeedbackCreateView(APIView):
    permission_classes = [IsAuthenticated, IsInterviewer]

    def post(self, request, pk):
        interview = get_object_or_404(Interview, pk=pk)
        serializer = FeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = InterviewService()
        feedback = service.submit_feedback(interview, **serializer.validated_data)
        return Response(FeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)

    def get(self, request, pk):
        interview = get_object_or_404(Interview, pk=pk)
        if hasattr(interview, 'feedback'):
            return Response(FeedbackSerializer(interview.feedback).data)
        return Response({'detail': 'No feedback yet'}, status=status.HTTP_404_NOT_FOUND)


class CodeSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        interview = get_object_or_404(Interview, pk=pk)
        serializer = CodeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = InterviewService()
        submission = service.execute_code(
            interview, serializer.validated_data['language'],
            serializer.validated_data['source_code'],
            serializer.validated_data.get('stdin', ''),
        )
        return Response(CodeSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)
