"""
apps/core/apps.py
Ubicación: Miami305/apps/core/apps.py

DESCRIPCIÓN:
AppConfig de core. Dos responsabilidades:

1. Sincroniza los Grupos del panel de administración con los roles del
   sistema (corrección #17): crea los grupos que falten y añade a cada
   usuario del personal a su grupo, de modo que en /admin/ "Grupos"
   refleje exactamente los roles: Administrador, Supervisor,
   Personal Miami, Personal Holguín.
   Se ejecuta la PRIMERA vez que se abre una conexión a la base de datos
   (no durante la inicialización de apps).

2. Corrección #10: al recibir cada petición, escala a "En tránsito" los
   bultos cuya fecha/hora de salida del vuelo ya pasó (máximo una vez por
   minuto). Así el paso a En tránsito es automático sin depender de cron.
"""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'apps.core'
    verbose_name = 'Miami305 Core'

    def ready(self):
        from django.db.backends.signals import connection_created
        from django.core.signals import request_started

        # ---------- 1. Grupos = roles (#17) ----------
        def _al_crear_conexion(sender, connection, **kwargs):
            if getattr(_al_crear_conexion, '_ejecutado', False):
                return
            _al_crear_conexion._ejecutado = True
            try:
                sincronizar_grupos()
            except Exception:
                # La BD puede estar migrándose aún; no romper el arranque
                pass

        connection_created.connect(_al_crear_conexion, dispatch_uid='miami305_sync_grupos')

        # ---------- 2. Salida automática del vuelo (#10) ----------
        def _en_cada_request(sender, **kwargs):
            import time
            ahora = time.monotonic()
            if ahora - getattr(_en_cada_request, '_ultima', 0) < 60:
                return
            _en_cada_request._ultima = ahora
            try:
                escalar_bultos_vencidos()
            except Exception:
                pass  # nunca romper una petición por la tarea de fondo

        request_started.connect(_en_cada_request, dispatch_uid='miami305_salida_auto')


def sincronizar_grupos():
    """
    Crea los grupos-rol y asigna cada usuario del personal al suyo.
    Idempotente: puede ejecutarse cualquier cantidad de veces.
    """
    from django.contrib.auth.models import Group
    from apps.users.models import Usuario

    grupos_por_rol = {
        'admin': 'Administrador',
        'supervisor': 'Supervisor',
        'empleado': 'Personal Miami',
        'holguin': 'Personal Holguín',
    }

    # 1. Crear los grupos que falten
    for nombre in grupos_por_rol.values():
        Group.objects.get_or_create(name=nombre)

    # 2. Añadir cada usuario del personal a su grupo correspondiente
    for u in Usuario.objects.filter(is_staff=True):
        nombre_grupo = grupos_por_rol.get(u.rol)
        if not nombre_grupo:
            continue
        grupo, _ = Group.objects.get_or_create(name=nombre_grupo)
        if not u.groups.filter(pk=grupo.pk).exists():
            u.groups.add(grupo)


def escalar_bultos_vencidos():
    """
    Corrección #10: los bultos consolidados cuya fecha/hora de salida ya
    pasaron (>= 1 min) pasan a En tránsito junto con sus paquetes.
    """
    from django.utils import timezone
    from apps.core.models import Envio

    ahora = timezone.now()
    vencidos = Envio.objects.filter(
        estado='consolidado',
        fecha_hora_salida__lt=ahora - timezone.timedelta(minutes=1),
    )
    for envio in vencidos:
        try:
            envio.marcar_en_transito(usuario=None, automatico=True)
        except Exception:
            continue
