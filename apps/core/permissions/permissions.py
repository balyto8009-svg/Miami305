from rest_framework import permissions

class IsAdminOrEmployee(permissions.BasePermission):
    """
    Permiso para usuarios con rol admin o empleado
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.rol in ['admin', 'empleado', 'supervisor']

class IsAdmin(permissions.BasePermission):
    """
    Permiso solo para administradores
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.rol == 'admin'

class IsPublicTracking(permissions.BasePermission):
    """
    Permiso para acceso público al seguimiento
    """
    def has_permission(self, request, view):
        # Endpoint de seguimiento es público
        return True