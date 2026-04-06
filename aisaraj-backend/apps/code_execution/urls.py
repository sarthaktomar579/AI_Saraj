"""Code execution URL routes."""
from django.urls import path
from . import views

app_name = 'code_execution'

urlpatterns = [
    path('execute/', views.ExecuteCodeView.as_view(), name='execute'),
    path('languages/', views.LanguagesView.as_view(), name='languages'),
]
