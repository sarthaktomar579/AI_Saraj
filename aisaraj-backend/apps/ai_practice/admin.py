"""Django admin registration for AI Practice app."""
from django.contrib import admin
from .models import PracticeSession, AIQuestion, AIAnswer, PracticeEvaluation


@admin.register(PracticeSession)
class PracticeSessionAdmin(admin.ModelAdmin):
    list_display = ('student', 'topic', 'difficulty', 'status', 'started_at')
    list_filter = ('status', 'difficulty', 'topic')
    search_fields = ('student__username', 'topic')
    raw_id_fields = ('student',)


@admin.register(AIQuestion)
class AIQuestionAdmin(admin.ModelAdmin):
    list_display = ('session', 'question_type', 'difficulty_level', 'order')
    list_filter = ('question_type', 'difficulty_level')
    raw_id_fields = ('session',)


@admin.register(AIAnswer)
class AIAnswerAdmin(admin.ModelAdmin):
    list_display = ('question', 'language', 'submitted_at')
    raw_id_fields = ('question',)


@admin.register(PracticeEvaluation)
class PracticeEvaluationAdmin(admin.ModelAdmin):
    list_display = ('session', 'total_score', 'hiring_signal', 'created_at')
    list_filter = ('hiring_signal',)
    raw_id_fields = ('session',)
