"""Interview serializers."""
from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from .models import Interview, InterviewFeedback, CodeSubmission


class InterviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = ['id', 'student', 'title', 'description', 'scheduled_at', 'duration_min']


class InterviewListSerializer(serializers.ModelSerializer):
    interviewer = UserMinimalSerializer(read_only=True)
    student = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Interview
        fields = ['id', 'interviewer', 'student', 'title', 'status',
                  'scheduled_at', 'duration_min', 'created_at']


class InterviewDetailSerializer(serializers.ModelSerializer):
    interviewer = UserMinimalSerializer(read_only=True)
    student = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Interview
        fields = '__all__'


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewFeedback
        fields = ['id', 'score', 'strengths', 'weaknesses', 'notes', 'created_at']


class CodeSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeSubmission
        fields = ['id', 'language', 'source_code', 'stdin', 'stdout',
                  'stderr', 'exit_code', 'executed_at']
        read_only_fields = ['stdout', 'stderr', 'exit_code', 'executed_at']
