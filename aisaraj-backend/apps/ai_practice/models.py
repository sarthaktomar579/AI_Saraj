"""AI Practice Mode models (Section 2)."""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class PracticeSession(models.Model):
    DIFFICULTY_CHOICES = [('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')]
    STATUS_CHOICES = [('active', 'Active'), ('completed', 'Completed')]
    SESSION_TYPE_CHOICES = [('practice', 'Practice'), ('scheduled', 'Scheduled')]

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='practice_sessions')
    topic = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    selected_tracks = models.JSONField(default=list)
    selected_subcategories = models.JSONField(default=dict)
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='practice')
    scheduled_interview_id = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    current_q_index = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'practice_sessions'
        ordering = ['-started_at']


class AIQuestion(models.Model):
    TYPE_CHOICES = [('conceptual', 'Conceptual'), ('coding', 'Coding'), ('verbal', 'Verbal')]
    session = models.ForeignKey(PracticeSession, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    difficulty_level = models.CharField(max_length=10)
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    order = models.IntegerField()

    class Meta:
        db_table = 'ai_questions'
        ordering = ['order']


class AIAnswer(models.Model):
    question = models.OneToOneField(AIQuestion, on_delete=models.CASCADE, related_name='answer')
    text_answer = models.TextField(blank=True)
    code_answer = models.TextField(blank=True)
    language = models.CharField(max_length=30, blank=True)
    execution_result = models.JSONField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_answers'


class PracticeEvaluation(models.Model):
    session = models.OneToOneField(PracticeSession, on_delete=models.CASCADE, related_name='evaluation')
    total_score = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    communication = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    technical_depth = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(25)])
    code_quality = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    optimization = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(15)])
    problem_solving = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    improvement_plan = models.JSONField(default=list)
    recommended_topics = models.JSONField(default=list)
    hiring_signal = models.CharField(max_length=20)
    raw_ai_response = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'practice_evaluations'
