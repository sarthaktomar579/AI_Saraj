"""Django admin registration for AI Interview app."""
from django.contrib import admin
from .models import AIScheduledInterview, AIInterviewQuestion, AIInterviewAnswer, AIInterviewReport


@admin.register(AIScheduledInterview)
class AIScheduledInterviewAdmin(admin.ModelAdmin):
    list_display = ('topic', 'interviewer', 'student', 'difficulty', 'status', 'scheduled_at')
    list_filter = ('status', 'difficulty')
    search_fields = ('topic', 'interviewer__username', 'student__username')
    raw_id_fields = ('interviewer', 'student')


@admin.register(AIInterviewQuestion)
class AIInterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ('interview', 'question_type', 'difficulty_level', 'order')
    raw_id_fields = ('interview',)


@admin.register(AIInterviewAnswer)
class AIInterviewAnswerAdmin(admin.ModelAdmin):
    list_display = ('question', 'language', 'submitted_at')
    raw_id_fields = ('question',)


@admin.register(AIInterviewReport)
class AIInterviewReportAdmin(admin.ModelAdmin):
    list_display = ('interview', 'total_score', 'hiring_signal', 'created_at')
    list_filter = ('hiring_signal',)
    raw_id_fields = ('interview',)
