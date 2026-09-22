"""
apps/users/urls.py
Ubicación: Miami305/apps/users/urls.py

DESCRIPCIÓN:
URLs del CRUD de usuarios (solo admin/supervisor).
"""
from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('usuarios/', views.usuarios_list_create, name='usuarios_list_create'),
    path('usuarios/<int:usuario_id>/', views.usuario_detail, name='usuario_detail'),
]
