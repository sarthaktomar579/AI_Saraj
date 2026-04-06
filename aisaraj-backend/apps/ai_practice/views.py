"""AI Practice views — upgraded with conversational acknowledgment."""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsStudent
from .models import PracticeSession
from .serializers import (
    SessionCreateSerializer, SessionDetailSerializer,
    AIQuestionSerializer, AnswerSubmitSerializer, PracticeEvaluationSerializer,
)
from .services import PracticeService


class SessionCreateView(generics.CreateAPIView):
    serializer_class = SessionCreateSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def perform_create(self, serializer):
        service = PracticeService()
        session = service.start_session(
            student=self.request.user,
            topic=serializer.validated_data['topic'],
            difficulty=serializer.validated_data['difficulty'],
            selected_tracks=serializer.validated_data['selected_tracks'],
            selected_subcategories=serializer.validated_data.get('selected_subcategories', {}),
        )
        serializer.instance = session


class SessionListView(generics.ListAPIView):
    serializer_class = SessionDetailSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return PracticeSession.objects.filter(student=self.request.user)


class SessionDetailView(generics.RetrieveAPIView):
    serializer_class = SessionDetailSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return PracticeSession.objects.filter(student=self.request.user)


class StartInterviewQuestionsView(APIView):
    """Generate verbal questions for selected tracks/subcategories."""
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        session = get_object_or_404(PracticeSession, pk=pk, student=request.user, status='active')
        service = PracticeService()
        question_count = 8 if 'dsa' in (session.selected_tracks or []) else 10
        questions = service.create_track_questions(session, question_count=question_count)
        return Response({
            'message': f'Generated {len(questions)} interview questions.',
            'questions': AIQuestionSerializer(questions, many=True).data,
        })


class AcknowledgeView(APIView):
    """AI acknowledges the candidate's answer before moving to next question."""
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        session = get_object_or_404(PracticeSession, pk=pk, student=request.user, status='active')
        question_id = request.data.get('question_id')
        answer_text = request.data.get('answer_text', '')

        service = PracticeService()

        # Save the answer
        try:
            service.submit_answer(session, question_id=question_id, text_answer=answer_text)
        except Exception:
            pass

        # Get AI acknowledgment
        result = service.acknowledge_answer(session, question_id=question_id, answer_text=answer_text)
        return Response(result)


class NextQuestionView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        session = get_object_or_404(PracticeSession, pk=pk, student=request.user, status='active')
        question = session.questions.filter(order=session.current_q_index).first()
        if question:
            session.current_q_index += 1
            session.save()
            return Response(AIQuestionSerializer(question).data)
        return Response({'detail': 'No more questions'}, status=status.HTTP_404_NOT_FOUND)


class LeetCodeView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        session = get_object_or_404(PracticeSession, pk=pk, student=request.user, status='active')
        service = PracticeService()
        question = service.generate_leetcode(session)
        return Response(AIQuestionSerializer(question).data)


class SubmitAnswerView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        session = get_object_or_404(PracticeSession, pk=pk, student=request.user, status='active')
        serializer = AnswerSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = PracticeService()
        service.submit_answer(session, **serializer.validated_data)
        return Response({'status': 'submitted'})


class ComprehensiveEvaluateView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        session = get_object_or_404(PracticeSession, pk=pk, student=request.user, status='active')
        service = PracticeService()
        evaluation = service.evaluate_comprehensive(
            session,
            code_explanation=request.data.get('code_explanation', ''),
            warning_count=int(request.data.get('warning_count', 0)),
            disqualified=bool(request.data.get('disqualified', False)),
            disqualify_reason=request.data.get('disqualify_reason', ''),
        )
        return Response(PracticeEvaluationSerializer(evaluation).data)

    def get(self, request, pk):
        session = get_object_or_404(PracticeSession, pk=pk, student=request.user)
        if hasattr(session, 'evaluation'):
            return Response(PracticeEvaluationSerializer(session.evaluation).data)
        return Response({'detail': 'Not evaluated yet'}, status=status.HTTP_404_NOT_FOUND)
