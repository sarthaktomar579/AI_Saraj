"""AI Practice serializers."""
from rest_framework import serializers
from .models import PracticeSession, AIQuestion, AIAnswer, PracticeEvaluation


class SessionCreateSerializer(serializers.ModelSerializer):
    selected_tracks = serializers.ListField(
        child=serializers.CharField(), allow_empty=False
    )
    selected_subcategories = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField(), allow_empty=True),
        required=False,
        default=dict,
    )
    session_type = serializers.ChoiceField(choices=['practice', 'scheduled'], required=False, default='practice')
    scheduled_interview_id = serializers.IntegerField(required=False, allow_null=True, default=None)

    def validate_selected_tracks(self, value):
        allowed = {'frontend', 'backend', 'dsa', 'data_analyst'}
        normalized = [v.strip().lower() for v in value if v and v.strip()]
        invalid = [v for v in normalized if v not in allowed]
        if invalid:
            raise serializers.ValidationError(f'Invalid track(s): {", ".join(invalid)}')
        return sorted(set(normalized))

    class Meta:
        model = PracticeSession
        fields = [
            'id', 'topic', 'difficulty', 'selected_tracks', 'selected_subcategories',
            'session_type', 'scheduled_interview_id',
        ]


class AIQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIQuestion
        fields = ['id', 'question_text', 'difficulty_level', 'question_type', 'order']


class AnswerSubmitSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    text_answer = serializers.CharField(required=False, allow_blank=True, default='')
    code_answer = serializers.CharField(required=False, allow_blank=True, default='')
    language = serializers.CharField(required=False, allow_blank=True, default='')


class PracticeEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeEvaluation
        fields = ['total_score', 'communication', 'technical_depth', 'code_quality',
                  'optimization', 'problem_solving', 'strengths', 'weaknesses',
                  'improvement_plan', 'recommended_topics', 'hiring_signal', 'raw_ai_response', 'created_at']


class SessionDetailSerializer(serializers.ModelSerializer):
    questions = AIQuestionSerializer(many=True, read_only=True)
    evaluation = PracticeEvaluationSerializer(read_only=True)

    class Meta:
        model = PracticeSession
        fields = ['id', 'topic', 'difficulty', 'selected_tracks', 'selected_subcategories',
                  'status', 'current_q_index',
                  'started_at', 'completed_at', 'questions', 'evaluation']
