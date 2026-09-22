"""
apps/core/views/views.py
Ubicación: Miami305/apps/core/views/views.py

DESCRIPCIÓN:
Vistas principales de la aplicación core.
Incluye endpoints para autenticación, dashboard, tracking, clientes y reportes.
"""
import json
import logging
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import authenticate, login
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, Avg
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

# Importación corregida: dos puntos para subir un nivel
from ..models import Cliente, Paquete
from ..permissions.roles import requiere_rol, ROLES_ADMIN, ROLES_MIAMI

logger = logging.getLogger(__name__)
User = get_user_model()


# ==========================================
# AUTENTICACIÓN
# ==========================================

@csrf_exempt
@ensure_csrf_cookie  # Garantiza que la cookie csrftoken se emita al iniciar sesión
def login_view(request):
    """Endpoint para iniciar sesión"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({
                'error': 'Usuario y contraseña son requeridos'
            }, status=400)
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            
            nombre_completo = f"{user.first_name} {user.last_name}".strip()
            if not nombre_completo:
                nombre_completo = user.username
            
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'nombre_completo': nombre_completo,
                    'rol': getattr(user, 'rol', 'usuario'),
                },
                'token': 'dummy-token-' + str(user.id)  # ✅ Siempre devolver token
            })
        else:
            return JsonResponse({
                'error': 'Credenciales inválidas'
            }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Datos inválidos'
        }, status=400)
    except Exception as e:
        logger.error(f"Error en login: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


# ==========================================
# CSRF
# ==========================================

@ensure_csrf_cookie
def csrf_view(request):
    """
    Entrega la cookie csrftoken al frontend.
    Permite auto-sanar sesiones iniciadas antes de activar la protección CSRF
    (evita el 403 'CSRF Failed: CSRF token missing.') sin necesidad de reloguear.
    """
    return JsonResponse({'detalle': 'Cookie CSRF emitida'})


# ==========================================
# DASHBOARD / ESTADÍSTICAS
# ==========================================

def stats_view(request):
    """Endpoint para obtener estadísticas del dashboard"""
    try:
        # Obtener totales
        total_clientes = Cliente.objects.count()
        total_envios = Paquete.objects.count()
        
        # Envíos por estado
        pendientes = Paquete.objects.filter(estado='recibido').count()
        consolidados = Paquete.objects.filter(estado='consolidado').count()
        en_transito = Paquete.objects.filter(estado='en_transito').count()
        en_cuba = Paquete.objects.filter(estado='en_cuba').count()
        entregados = Paquete.objects.filter(estado='entregado').count()
        
        # Ingresos del mes actual
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        
        ingresos_mes = Paquete.objects.filter(
            fecha_recepcion__date__gte=inicio_mes,
            fecha_recepcion__date__lte=hoy
        ).aggregate(total=Sum('tarifa'))['total'] or 0
        
        # Corrección #16: ingresos reales de TODOS los paquetes registrados
        # y bultos activos (consolidados/en vuelo) para el Panel Principal
        from apps.core.models import Envio
        ingresos_totales = Paquete.objects.aggregate(
            total=Sum('tarifa')
        )['total'] or 0
        bultos_activos = Envio.objects.filter(
            estado__in=['consolidado', 'en_curso']
        ).count()

        return JsonResponse({
            'total_clientes': total_clientes,
            'total_envios': total_envios,
            # Claves usadas por el Dashboard del frontend
            'paquetes_recibidos': pendientes,
            'recibidos': pendientes,
            'recibido': pendientes,
            'pendientes': pendientes,
            'paquetes_consolidados': consolidados,
            'consolidados': consolidados,
            'consolidado': consolidados,
            'paquetes_en_transito': en_transito,
            'en_transito': en_transito,
            'paquetes_en_cuba': en_cuba,
            'en_cuba': en_cuba,
            'paquetes_entregados': entregados,
            'entregados': entregados,
            'entregado': entregados,
            'bultos_activos': bultos_activos,
            'ingresos_totales': float(ingresos_totales),
            'ingresos_mes': float(ingresos_mes),
        })
        
    except Exception as e:
        logger.error(f"Error en stats: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


def envios_list_view(request):
    """Endpoint para listar envíos con filtros"""
    try:
        # Obtener parámetros de filtro
        search = request.GET.get('search', '')
        estado = request.GET.get('estado', '')
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        
        # Construir queryset
        queryset = Paquete.objects.select_related('cliente', 'destinatario')
        
        if search:
            queryset = queryset.filter(
                Q(codigo_seguimiento__icontains=search) |
                Q(cliente__nombre_completo__icontains=search)
            )
        
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Ordenar por fecha más reciente
        queryset = queryset.order_by('-fecha_recepcion')
        
        # Paginación
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        results = queryset[start:end]
        
        # Serializar datos
        data = []
        for paquete in results:
            data.append({
                'id': paquete.id,
                'codigo_seguimiento': paquete.codigo_seguimiento,
                'cliente': {
                    'id': paquete.cliente.id,
                    'nombre_completo': paquete.cliente.nombre_completo,
                } if paquete.cliente else None,
                'destinatario': {
                    'id': paquete.destinatario.id,
                    'nombre_completo': paquete.destinatario.nombre_completo,
                    'provincia': paquete.destinatario.get_provincia_display(),
                } if paquete.destinatario else None,
                'peso_kg': float(paquete.peso_total_kg or 0),
                'peso_total_kg': float(paquete.peso_total_kg or 0),
                'tarifa': float(paquete.tarifa),
                'estado': paquete.estado,
                'estado_display': paquete.get_estado_display(),
                'fecha_recepcion': paquete.fecha_recepcion.isoformat(),
                'fecha_entrega_real': paquete.fecha_entrega_real.isoformat() if paquete.fecha_entrega_real else None,
            })
        
        return JsonResponse({
            'count': total,
            'next': None,
            'previous': None,
            'results': data
        })
        
    except Exception as e:
        logger.error(f"Error en envios_list: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


# ==========================================
# TRACKING (Público)
# ==========================================

def tracking_view(request, codigo):
    """Endpoint público para tracking de envíos"""
    try:
        paquete = Paquete.objects.select_related('cliente', 'destinatario').get(
            codigo_seguimiento=codigo
        )
        
        return JsonResponse({
            'codigo_seguimiento': paquete.codigo_seguimiento,
            'cliente': {
                'nombre_completo': paquete.cliente.nombre_completo,
            } if paquete.cliente else None,
            'destinatario': {
                'nombre_completo': paquete.destinatario.nombre_completo,
                'provincia': paquete.destinatario.get_provincia_display(),
                'municipio': paquete.destinatario.get_municipio_display(),
            } if paquete.destinatario else None,
            'peso_kg': float(paquete.peso_total_kg or 0),
            'tarifa': float(paquete.tarifa),
            'estado': paquete.estado,
            'fecha_recepcion': paquete.fecha_recepcion.isoformat(),
            'fecha_entrega_real': paquete.fecha_entrega_real.isoformat() if paquete.fecha_entrega_real else None,
            'historial': [
                {
                    'fecha': paquete.fecha_recepcion.isoformat(),
                    'estado': 'Recibido en Miami',
                    'descripcion': 'Paquete registrado en el sistema'
                }
            ]
        })
        
    except Paquete.DoesNotExist:
        return JsonResponse({
            'error': 'No se encontró el envío'
        }, status=404)
    except Exception as e:
        logger.error(f"Error en tracking: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


# ==========================================
# CLIENTES
# ==========================================

def clientes_list_view(request):
    """Endpoint para listar clientes"""
    try:
        search = request.GET.get('search', '')
        
        queryset = Cliente.objects.all()
        
        if search:
            queryset = queryset.filter(
                Q(nombre_completo__icontains=search) |
                Q(email__icontains=search) |
                Q(telefono__icontains=search)
            )
        
        queryset = queryset.order_by('-fecha_registro')
        
        data = []
        for cliente in queryset:
            data.append({
                'id': cliente.id,
                'nombre_completo': cliente.nombre_completo,
                'email': cliente.email,
                'telefono': cliente.telefono,
                'domicilio': cliente.domicilio,
                'fecha_registro': cliente.fecha_registro.isoformat(),
                'activo': cliente.activo,
            })
        
        return JsonResponse({
            'count': len(data),
            'results': data
        })
        
    except Exception as e:
        logger.error(f"Error en clientes_list: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


@csrf_exempt
@requiere_rol(*ROLES_MIAMI)  # Miami (admin/supervisor/empleado) crea clientes; Holguín no
def cliente_create_view(request):
    """Endpoint para crear un cliente"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        cliente = Cliente.objects.create(
            nombre_completo=data.get('nombre_completo'),
            email=data.get('email', ''),
            telefono=data.get('telefono', ''),
            domicilio=data.get('domicilio', ''),
        )
        
        return JsonResponse({
            'id': cliente.id,
            'nombre_completo': cliente.nombre_completo,
            'email': cliente.email,
            'telefono': cliente.telefono,
            'domicilio': cliente.domicilio,
            'fecha_registro': cliente.fecha_registro.isoformat(),
        }, status=201)
        
    except Exception as e:
        logger.error(f"Error en cliente_create: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


@csrf_exempt
@requiere_rol(*ROLES_ADMIN)  # Solo admin/supervisor elimina clientes
def cliente_delete_view(request, id):
    """Endpoint para eliminar un cliente"""
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        cliente = Cliente.objects.get(id=id)
        cliente.delete()
        return JsonResponse({'success': True})
        
    except Cliente.DoesNotExist:
        return JsonResponse({
            'error': 'Cliente no encontrado'
        }, status=404)
    except Exception as e:
        logger.error(f"Error en cliente_delete: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


@csrf_exempt
@requiere_rol(*ROLES_MIAMI)  # Miami (admin/supervisor/empleado) edita clientes
def cliente_update_view(request, id):
    """Endpoint para editar un cliente (PUT/PATCH)"""
    if request.method not in ('PUT', 'PATCH'):
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        cliente = Cliente.objects.get(id=id)
    except Cliente.DoesNotExist:
        return JsonResponse({'error': 'Cliente no encontrado'}, status=404)

    try:
        data = json.loads(request.body or b'{}')
        for campo in ('nombre_completo', 'email', 'telefono', 'domicilio'):
            if campo in data:
                setattr(cliente, campo, data[campo])
        if 'activo' in data:
            cliente.activo = bool(data['activo'])
        cliente.full_clean()
        cliente.save()

        return JsonResponse({
            'id': cliente.id,
            'nombre_completo': cliente.nombre_completo,
            'email': cliente.email,
            'telefono': cliente.telefono,
            'domicilio': cliente.domicilio,
            'activo': cliente.activo,
            'fecha_registro': cliente.fecha_registro.isoformat(),
        })
    except Exception as e:
        logger.error(f"Error en cliente_update: {e}")
        return JsonResponse({'error': str(e)}, status=400)


# ==========================================
# REPORTES
# ==========================================

def reportes_generales_view(request):
    """Endpoint para obtener estadísticas generales"""
    try:
        total_envios = Paquete.objects.count()
        total_clientes = Cliente.objects.count()
        
        # Calcular promedio de envíos por día (Últimos 30 días)
        fecha_inicio = timezone.now() - timedelta(days=30)
        envios_30_dias = Paquete.objects.filter(
            fecha_recepcion__gte=fecha_inicio
        ).count()
        promedio_por_dia = round(envios_30_dias / 30, 1) if envios_30_dias > 0 else 0
        
        # Tarifa promedio
        tarifa_promedio = Paquete.objects.aggregate(
            avg=Avg('tarifa')
        )['avg'] or 0
        
        # Ingresos totales
        ingresos_totales = Paquete.objects.aggregate(
            total=Sum('tarifa')
        )['total'] or 0
        
        return JsonResponse({
            'total_envios': total_envios,
            'total_clientes': total_clientes,
            'promedio_por_dia': promedio_por_dia,
            'tarifa_promedio': float(tarifa_promedio),
            'ingresos_totales': float(ingresos_totales),
        })
        
    except Exception as e:
        logger.error(f"Error en reportes_generales: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


def reportes_envios_por_estado_view(request):
    """Endpoint para obtener envíos agrupados por estado"""
    try:
        estados = Paquete.objects.values('estado').annotate(
            cantidad=Count('id')
        ).order_by('estado')
        
        # Mapeo de estados a nombres legibles
        estado_nombres = {
            'recibido': 'Recibido',
            'consolidado': 'Consolidado',
            'en_transito': 'En Tránsito',
            'en_cuba': 'En Cuba',
            'entregado': 'Entregado',
        }
        
        data = []
        for item in estados:
            data.append({
                'estado': item['estado'],
                'nombre': estado_nombres.get(item['estado'], item['estado']),
                'cantidad': item['cantidad'],
            })
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        logger.error(f"Error en reportes_envios_por_estado: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


def reportes_envios_por_mes_view(request):
    """Endpoint para obtener envíos agrupados por mes"""
    try:
        year = request.GET.get('year', timezone.now().year)
        
        # Obtener envíos agrupados por mes
        envios_por_mes = Paquete.objects.filter(
            fecha_recepcion__year=year
        ).extra(
            select={'mes': "EXTRACT(MONTH FROM fecha_recepcion)"}
        ).values('mes').annotate(
            cantidad=Count('id')
        ).order_by('mes')
        
        # Nombres de meses en español
        meses_nombres = {
            1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
            5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
            9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
        }
        
        # Crear lista con todos los meses (incluso los que no tienen datos)
        datos_meses = []
        for mes in range(1, 13):
            cantidad = 0
            for item in envios_por_mes:
                if item['mes'] == mes:
                    cantidad = item['cantidad']
                    break
            datos_meses.append({
                'mes': meses_nombres.get(mes, str(mes)),
                'mes_numero': mes,
                'cantidad': cantidad,
            })
        
        return JsonResponse(datos_meses, safe=False)
        
    except Exception as e:
        logger.error(f"Error en reportes_envios_por_mes: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


def reportes_clientes_top_view(request):
    """Endpoint para obtener los clientes con más envíos"""
    try:
        limit = int(request.GET.get('limit', 10))
        
        clientes_top = Cliente.objects.annotate(
            total_envios=Count('paquetes')
        ).filter(
            total_envios__gt=0
        ).order_by('-total_envios')[:limit]
        
        data = []
        for cliente in clientes_top:
            data.append({
                'id': cliente.id,
                'nombre_completo': cliente.nombre_completo,
                'total_envios': cliente.total_envios,
            })
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        logger.error(f"Error en reportes_clientes_top: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)


def reportes_ingresos_view(request):
    """Endpoint para obtener ingresos por período"""
    try:
        # Obtener parámetros
        fecha_inicio = request.GET.get('fecha_inicio')
        fecha_fin = request.GET.get('fecha_fin')
        
        queryset = Paquete.objects.all()
        
        if fecha_inicio:
            queryset = queryset.filter(fecha_recepcion__date__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(fecha_recepcion__date__lte=fecha_fin)
        
        # Agrupar por día
        ingresos_por_dia = queryset.extra(
            select={'dia': "DATE(fecha_recepcion)"}
        ).values('dia').annotate(
            total=Sum('tarifa')
        ).order_by('dia')[:30]  # Últimos 30 días
        
        data = []
        for item in ingresos_por_dia:
            data.append({
                'fecha': item['dia'].isoformat() if item['dia'] else None,
                'total': float(item['total']) if item['total'] else 0,
            })
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        logger.error(f"Error en reportes_ingresos: {e}")
        return JsonResponse({
            'error': str(e)
        }, status=500)