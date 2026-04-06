"""Root URL configuration for AISaraj."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/interviews/', include('apps.interviews.urls')),
    path('api/v1/ai-practice/', include('apps.ai_practice.urls')),
    path('api/v1/ai-interviews/', include('apps.ai_interview.urls')),
    path('api/v1/code/', include('apps.code_execution.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
