"""Interview business logic."""
from apps.video.services import VideoService
from apps.code_execution.services import SandboxService
from .models import Interview, InterviewFeedback, CodeSubmission


class InterviewService:
    def __init__(self):
        self.video_service = VideoService()
        self.sandbox = SandboxService()

    def schedule(self, interviewer, student, title, scheduled_at, description='', duration_min=60):
        interview = Interview.objects.create(
            interviewer=interviewer, student=student, title=title,
            scheduled_at=scheduled_at, description=description,
            duration_min=duration_min, status='scheduled',
        )
        try:
            call_info = self.video_service.create_call(
                call_id=f'interview-{interview.id}',
                participants=[str(interviewer.id), str(student.id)],
            )
            interview.video_call_id = call_info.call_id
            interview.save()
        except Exception:
            pass  # Video room creation is non-critical at scheduling time
        return interview

    def get_video_token(self, user, interview):
        return self.video_service.get_token(str(user.id), interview.video_call_id)

    def submit_feedback(self, interview, score, strengths, weaknesses, notes=''):
        return InterviewFeedback.objects.create(
            interview=interview, score=score,
            strengths=strengths, weaknesses=weaknesses, notes=notes,
        )

    def execute_code(self, interview, language, source_code, stdin=''):
        result = self.sandbox.execute(language, source_code, stdin)
        submission = CodeSubmission.objects.create(
            interview=interview, language=language, source_code=source_code,
            stdin=stdin, stdout=result['stdout'], stderr=result['stderr'],
            exit_code=result['exit_code'],
        )
        return submission
