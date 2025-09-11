from django.contrib import admin
from django.urls import path, include

# filepath: cropai_backend/urls.py
urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('frontend.urls')),
]