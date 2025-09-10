from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/predict/', views.predict_yield, name='predict_yield'),
    path('learning-resources/', views.learning_resources, name='learning_resources'),
]