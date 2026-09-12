"""
Modelo de Usuario personalizado para Miami305
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """Modelo de usuario extendido con roles"""
    
    ROLES = [
        ('admin', 'Administrador'),
        ('supervisor', 'Supervisor'),
        ('empleado', 'Empleado'),
        ('cliente', 'Cliente'),
    ]
    
    rol = models.CharField(
        max_length=20,
        choices=ROLES,
        default='cliente',
        verbose_name='Rol'
    )
    telefono = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Teléfono'
    )
    activo = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )
    fecha_contratacion = models.DateField(
        auto_now_add=True,
        verbose_name='Fecha de contratación'
    )
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.username} - {self.get_rol_display()}"