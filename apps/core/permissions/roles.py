"""
apps/core/permissions/roles.py
Ubicación: Miami305/apps/core/permissions/roles.py

DESCRIPCIÓN:
Control de acceso por rol para toda la API.

MATRIZ DE PERMISOS:
| Acción                        | admin/supervisor | empleado (Miami) | holguin |
|-------------------------------|------------------|------------------|---------|
| Categorías y tarifas (CRUD)   | ✅               | ❌               | ❌      |
| Crear cliente                 | ✅               | ✅               | ❌      |
| Editar cliente                | ✅               | ✅               | ❌      |
| Eliminar cliente              | ✅               | ❌               | ❌      |
| Crear destinatario            | ✅               | ✅               | ❌      |
| Editar destinatario           | ✅               | ✅               | ✅      |
| Eliminar destinatario         | ✅               | ❌               | ❌      |
"""
from functools import wraps

from django.http import JsonResponse

ROLES_ADMIN = ('admin', 'supervisor')
ROLES_MIAMI = ('admin', 'supervisor', 'empleado')
ROLES_TODOS = ('admin', 'supervisor', 'empleado', 'holguin')


def _rol_de(user):
    return getattr(user, 'rol', '') or ''


def es_admin(user):
    """True para administradores y supervisores/gerentes."""
    return _rol_de(user) in ROLES_ADMIN


def es_personal_miami(user):
    """True para quien puede gestionar clientes y paquetes en Miami."""
    return _rol_de(user) in ROLES_MIAMI


def puede_editar_destinatarios(user):
    """Miami y Holguín pueden editar destinatarios."""
    return _rol_de(user) in ROLES_TODOS


def requiere_rol(*roles):
    """
    Decorador para vistas function-based: permite el acceso solo a los roles
    indicados (siempre autenticados). Devuelve 403 con un mensaje claro.

    Uso:
        @requiere_rol(*ROLES_ADMIN)
        def mi_vista(request): ...
    """
    def decorador(vista):
        @wraps(vista)
        def envoltura(request, *args, **kwargs):
            user = getattr(request, 'user', None)
            if user is None or not getattr(user, 'is_authenticated', False):
                return JsonResponse({'error': 'Debes iniciar sesión'}, status=403)
            if user.is_superuser or _rol_de(user) in roles:
                return vista(request, *args, **kwargs)
            return JsonResponse({
                'error': 'No tienes permisos para esta acción',
                'detalle': f'Requiere rol: {", ".join(roles)}',
            }, status=403)
        return envoltura
    return decorador
