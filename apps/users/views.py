"""
apps/users/views.py
Ubicación: Miami305/apps/users/views.py

DESCRIPCIÓN:
CRUD de usuarios del personal para el frontend (solo admin/supervisor).
Los usuarios de rol 'cliente' no se crean aquí: los clientes reales del
directorio no inician sesión en la aplicación.
"""
import json
import logging

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import ProtectedError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..core.permissions.roles import requiere_rol, ROLES_ADMIN

logger = logging.getLogger(__name__)
Usuario = get_user_model()

ROLES_VALIDOS = {rol for rol, _ in Usuario._meta.get_field('rol').choices}


def _usuario_json(u):
    return {
        'id': u.id,
        'username': u.username,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'nombre_completo': f"{u.first_name} {u.last_name}".strip() or u.username,
        'email': u.email,
        'telefono': u.telefono,
        'rol': u.rol,
        'rol_display': u.get_rol_display(),
        'is_active': u.is_active,
        'is_superuser': u.is_superuser,
        'ultimo_acceso': u.last_login.isoformat() if u.last_login else None,
    }


@csrf_exempt
@requiere_rol(*ROLES_ADMIN)
def usuarios_list_create(request):
    """
    GET  /api/usuarios/           → lista del personal
    POST /api/usuarios/           → crear usuario (solo admin/supervisor)
    """
    if request.method == 'GET':
        usuarios = Usuario.objects.all().order_by('username')
        return JsonResponse([_usuario_json(u) for u in usuarios], safe=False)

    if request.method == 'POST':
        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        username = (data.get('username') or '').strip()
        password = data.get('password') or ''
        rol = data.get('rol') or 'empleado'

        if not username or not password:
            return JsonResponse({'error': 'Usuario y contraseña son obligatorios'}, status=400)
        if rol not in ROLES_VALIDOS:
            return JsonResponse({'error': f'Rol inválido: {rol}'}, status=400)
        if Usuario.objects.filter(username__iexact=username).exists():
            return JsonResponse({'error': 'Ya existe ese nombre de usuario'}, status=400)
        if len(password) < 6:
            return JsonResponse({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)

        try:
            usuario = Usuario.objects.create_user(
                username=username,
                password=password,
                email=data.get('email') or '',
                first_name=data.get('first_name') or '',
                last_name=data.get('last_name') or '',
                rol=rol,
            )
            usuario.telefono = data.get('telefono') or ''
            usuario.is_active = bool(data.get('is_active', True))
            usuario.save()
        except ValidationError as e:
            return JsonResponse({'error': 'Datos inválidos', 'detalle': e.message_dict}, status=400)
        except Exception as e:
            logger.error(f'Error al crear usuario: {e}', exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

        return JsonResponse(_usuario_json(usuario), status=201)

    return JsonResponse({'error': 'Método no permitido'}, status=405)


@csrf_exempt
@requiere_rol(*ROLES_ADMIN)
def usuario_detail(request, usuario_id):
    """
    PUT/PATCH /api/usuarios/<id>/  → editar (solo admin/supervisor)
    DELETE    /api/usuarios/<id>/  → eliminar o desactivar (solo admin/supervisor)
    """
    try:
        usuario = Usuario.objects.get(id=usuario_id)
    except Usuario.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)

    if request.method in ('PUT', 'PATCH'):
        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        if 'username' in data:
            username = (data['username'] or '').strip()
            if not username:
                return JsonResponse({'error': 'El usuario no puede quedar vacío'}, status=400)
            if (Usuario.objects.exclude(id=usuario.id)
                    .filter(username__iexact=username).exists()):
                return JsonResponse({'error': 'Ya existe ese nombre de usuario'}, status=400)
            usuario.username = username

        if 'rol' in data:
            if data['rol'] not in ROLES_VALIDOS:
                return JsonResponse({'error': f"Rol inválido: {data['rol']}"}, status=400)
            # Un admin no puede quitarse su propio acceso de administración
            if usuario.id == request.user.id and data['rol'] not in ROLES_ADMIN:
                return JsonResponse(
                    {'error': 'No puedes quitarte tu propio rol de administración'}, status=400)
            usuario.rol = data['rol']

        for campo in ('first_name', 'last_name', 'email', 'telefono'):
            if campo in data:
                setattr(usuario, campo, data[campo] or '')

        if 'is_active' in data:
            if usuario.id == request.user.id and not data['is_active']:
                return JsonResponse({'error': 'No puedes desactivar tu propia cuenta'}, status=400)
            usuario.is_active = bool(data['is_active'])

        nueva_password = data.get('password') or ''
        if nueva_password:
            if len(nueva_password) < 6:
                return JsonResponse(
                    {'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)
            usuario.set_password(nueva_password)

        try:
            usuario.full_clean(exclude=['password'])
            usuario.save()
        except ValidationError as e:
            return JsonResponse({'error': 'Datos inválidos', 'detalle': e.message_dict}, status=400)

        return JsonResponse(_usuario_json(usuario))

    if request.method == 'DELETE':
        if usuario.id == request.user.id:
            return JsonResponse({'error': 'No puedes eliminar tu propia cuenta'}, status=400)
        try:
            usuario.delete()
            return JsonResponse({'success': True})
        except ProtectedError:
            # Tiene eventos/trazas asociadas: se desactiva en lugar de borrarse
            usuario.is_active = False
            usuario.save()
            return JsonResponse({'success': True, 'desactivado': True,
                                 'detalle': 'El usuario tiene registros asociados: fue desactivado en lugar de eliminado'})

    return JsonResponse({'error': 'Método no permitido'}, status=405)
