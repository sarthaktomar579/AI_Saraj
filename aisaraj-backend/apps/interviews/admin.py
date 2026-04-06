"""Django admin registration for interviews app."""
from django.contrib import admin
from .models import Interview, InterviewFeedback, CodeSubmission


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ('title', 'interviewer', 'student', 'status', 'scheduled_at')
    list_filter = ('status',)
    search_fields = ('title', 'interviewer__username', 'student__username')
    raw_id_fields = ('interviewer', 'student')


@admin.register(InterviewFeedback)
class InterviewFeedbackAdmin(admin.ModelAdmin):
    list_display = ('interview', 'score', 'created_at')
    raw_id_fields = ('interview',)


@admin.register(CodeSubmission)
class CodeSubmissionAdmin(admin.ModelAdmin):
    list_display = ('interview', 'language', 'exit_code', 'executed_at')
    list_filter = ('language',)
    raw_id_fields = ('interview',)
