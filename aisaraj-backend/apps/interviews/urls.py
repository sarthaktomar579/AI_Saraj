"""Interview URL routes."""
from django.urls import path
from . import views

app_name = 'interviews'

urlpatterns = [
    path('', views.InterviewCreateView.as_view(), name='create'),
    path('list/', views.InterviewListView.as_view(), name='list'),
    path('<int:pk>/', views.InterviewDetailView.as_view(), name='detail'),
    path('<int:pk>/video-token/', views.VideoTokenView.as_view(), name='video-token'),
    path('<int:pk>/feedback/', views.FeedbackCreateView.as_view(), name='feedback'),
    path('<int:pk>/code-submit/', views.CodeSubmitView.as_view(), name='code-submit'),
]
