"""AI Scheduled Interview models (Section 3)."""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class AIScheduledInterview(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'), ('in_progress', 'In Progress'),
        ('completed', 'Completed'), ('cancelled', 'Cancelled'),
    ]
    interviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scheduled_ai_interviews')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_interviews')
    topic = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=10)
    scheduled_at = models.DateTimeField()
    deadline = models.DateTimeField(null=True, blank=True)
    company_name = models.CharField(max_length=200, blank=True, default='')
    selected_tracks = models.JSONField(default=list, blank=True)
    selected_subcategories = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    recording_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_scheduled_interviews'
        ordering = ['-scheduled_at']


class AIInterviewQuestion(models.Model):
    interview = models.ForeignKey(AIScheduledInterview, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    difficulty_level = models.CharField(max_length=10)
    question_type = models.CharField(max_length=20)
    order = models.IntegerField()

    class Meta:
        db_table = 'ai_interview_questions'
        ordering = ['order']


class AIInterviewAnswer(models.Model):
    question = models.OneToOneField(AIInterviewQuestion, on_delete=models.CASCADE, related_name='answer')
    text_answer = models.TextField(blank=True)
    code_answer = models.TextField(blank=True)
    language = models.CharField(max_length=30, blank=True)
    execution_result = models.JSONField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_interview_answers'


class AIInterviewReport(models.Model):
    interview = models.OneToOneField(AIScheduledInterview, on_delete=models.CASCADE, related_name='report')
    total_score = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    communication = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    technical_depth = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(25)])
    code_quality = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    optimization = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(15)])
    problem_solving = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    warning_count = models.IntegerField(default=0)
    disqualified = models.BooleanField(default=False)
    disqualify_reason = models.CharField(max_length=200, blank=True, default='')
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    improvement_plan = models.JSONField(default=list)
    recommended_topics = models.JSONField(default=list)
    hiring_signal = models.CharField(max_length=20)
    skill_gap_analysis = models.JSONField(default=dict)
    raw_ai_response = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_interview_reports'
