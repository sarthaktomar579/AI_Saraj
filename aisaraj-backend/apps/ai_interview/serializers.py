"""AI Interview serializers."""
from rest_framework import serializers
from apps.accounts.serializers import UserMinimalSerializer
from .models import AIScheduledInterview, AIInterviewQuestion, AIInterviewAnswer, AIInterviewReport


class AIInterviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIScheduledInterview
        fields = ['id', 'student', 'topic', 'difficulty', 'scheduled_at',
                  'deadline', 'company_name', 'selected_tracks', 'selected_subcategories']


class AIInterviewListSerializer(serializers.ModelSerializer):
    interviewer = UserMinimalSerializer(read_only=True)
    student = UserMinimalSerializer(read_only=True)
    has_report = serializers.SerializerMethodField()

    class Meta:
        model = AIScheduledInterview
        fields = ['id', 'interviewer', 'student', 'topic', 'difficulty',
                  'status', 'scheduled_at', 'deadline', 'company_name',
                  'selected_tracks', 'selected_subcategories',
                  'created_at', 'has_report']

    def get_has_report(self, obj):
        return hasattr(obj, 'report')


class AIInterviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInterviewQuestion
        fields = ['id', 'question_text', 'difficulty_level', 'question_type', 'order']


class AIInterviewAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    text_answer = serializers.CharField(required=False, allow_blank=True, default='')
    code_answer = serializers.CharField(required=False, allow_blank=True, default='')
    language = serializers.CharField(required=False, allow_blank=True, default='')


class AIInterviewReportSerializer(serializers.ModelSerializer):
    interview_id = serializers.IntegerField(source='interview.id', read_only=True)
    student = serializers.SerializerMethodField()

    class Meta:
        model = AIInterviewReport
        fields = ['interview_id', 'student', 'total_score', 'communication', 'technical_depth',
                  'code_quality', 'optimization', 'problem_solving',
                  'warning_count', 'disqualified', 'disqualify_reason',
                  'strengths', 'weaknesses',
                  'improvement_plan', 'recommended_topics', 'hiring_signal',
                  'skill_gap_analysis', 'created_at']

    def get_student(self, obj):
        return UserMinimalSerializer(obj.interview.student).data


class AIInterviewDetailSerializer(serializers.ModelSerializer):
    interviewer = UserMinimalSerializer(read_only=True)
    student = UserMinimalSerializer(read_only=True)
    questions = AIInterviewQuestionSerializer(many=True, read_only=True)
    report = AIInterviewReportSerializer(read_only=True)

    class Meta:
        model = AIScheduledInterview
        fields = '__all__'
