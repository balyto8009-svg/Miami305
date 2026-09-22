"""
apps/core/management/commands/limpiar_paquete.py
Ubicación: Miami305/apps/core/management/commands/limpiar_paquete.py

DESCRIPCIÓN:
Corrección #10: escalar automáticamente a "En tránsito" todos los bultos
cuya fecha/hora de salida del vuelo programada ya pasó, junto con sus
paquetes (que quedan 'en_transito').

Se ejecuta:
1. Automáticamente al recibir peticiones del backend (hook request_started,
   como máximo una vez por minuto).
2. Manualmente:
       venv/Scripts/python.exe manage.py limpiar_paquete
3. Programado (opcional, si se desea precisión de cron):
       * * * * *  venv/Scripts/python.exe manage.py limpiar_paquete
"""
import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import Envio

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Pone En tránsito los bultos cuya fecha/hora de salida del vuelo ya pasó (#10)'

    def handle(self, *args, **options):
        ahora = timezone.now()

        # Bultos consolidados con salida vencida (>= 1 minuto atrás)
        vencidos = Envio.objects.filter(
            estado='consolidado',
            fecha_hora_salida__lt=ahora - timezone.timedelta(minutes=1),
        )

        total_bultos = 0
        total_paquetes = 0
        for envio in vencidos:
            if envio.marcar_en_transito(usuario=None, automatico=True):
                total_bultos += 1
                total_paquetes += envio.paquetes.filter(estado='en_transito').count()

        self.stdout.write(self.style.SUCCESS(
            f'{total_bultos} bulto(s) pasados a En tránsito '
            f'({total_paquetes} paquete(s) actualizados).'
        ))
