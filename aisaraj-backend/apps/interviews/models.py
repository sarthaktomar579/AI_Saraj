"""Human Interview models (Section 1)."""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Interview(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='conducted_interviews'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='attended_interviews'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    scheduled_at = models.DateTimeField()
    duration_min = models.IntegerField(default=60)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    video_call_id = models.CharField(max_length=255, null=True, blank=True)
    recording_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interviews'
        ordering = ['-scheduled_at']

    def __str__(self):
        return f'{self.title} ({self.status})'


class InterviewFeedback(models.Model):
    interview = models.OneToOneField(Interview, on_delete=models.CASCADE, related_name='feedback')
    score = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_feedback'


class CodeSubmission(models.Model):
    interview = models.ForeignKey(Interview, on_delete=models.CASCADE, related_name='code_submissions')
    language = models.CharField(max_length=30)
    source_code = models.TextField()
    stdin = models.TextField(blank=True)
    stdout = models.TextField(blank=True)
    stderr = models.TextField(blank=True)
    exit_code = models.IntegerField(null=True)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'code_submissions'
        ordering = ['-executed_at']
