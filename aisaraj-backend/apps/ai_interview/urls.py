"""AI Interview URL routes."""
from django.urls import path
from . import views

app_name = 'ai_interview'

urlpatterns = [
    path('', views.AIInterviewCreateView.as_view(), name='create'),
    path('list/', views.AIInterviewListView.as_view(), name='list'),
    path('students/', views.StudentListView.as_view(), name='students'),
    path('<int:pk>/', views.AIInterviewDetailView.as_view(), name='detail'),
    path('<int:pk>/start/', views.StartInterviewView.as_view(), name='start'),
    path('<int:pk>/next-question/', views.NextQuestionView.as_view(), name='next-question'),
    path('<int:pk>/submit-answer/', views.SubmitAnswerView.as_view(), name='submit-answer'),
    path('<int:pk>/upload-recording/', views.UploadRecordingView.as_view(), name='upload-recording'),
    path('<int:pk>/complete/', views.CompleteInterviewView.as_view(), name='complete'),
    path('<int:pk>/save-report/', views.SaveReportView.as_view(), name='save-report'),
    path('<int:pk>/report/', views.ReportView.as_view(), name='report'),
]
