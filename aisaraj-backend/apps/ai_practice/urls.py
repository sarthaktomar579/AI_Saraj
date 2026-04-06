"""AI Practice URL routing."""
from django.urls import path
from . import views

app_name = 'ai_practice'

urlpatterns = [
    path('sessions/', views.SessionCreateView.as_view(), name='session-create'),
    path('sessions/list/', views.SessionListView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', views.SessionDetailView.as_view(), name='session-detail'),
    path('sessions/<int:pk>/start-questions/', views.StartInterviewQuestionsView.as_view(), name='start-questions'),
    path('sessions/<int:pk>/acknowledge/', views.AcknowledgeView.as_view(), name='acknowledge'),
    path('sessions/<int:pk>/next-question/', views.NextQuestionView.as_view(), name='next-question'),
    path('sessions/<int:pk>/leetcode/', views.LeetCodeView.as_view(), name='leetcode'),
    path('sessions/<int:pk>/submit/', views.SubmitAnswerView.as_view(), name='submit-answer'),
    path('sessions/<int:pk>/evaluate/', views.ComprehensiveEvaluateView.as_view(), name='evaluate'),
]
