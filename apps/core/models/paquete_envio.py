from django.db import models
from .paquete import Paquete
#from .paquete import Ãltima actualización
from .envio import Envio

class PaqueteEnvio(models.Model):
    paquete = models.ForeignKey(Paquete, on_delete=models.CASCADE)
    envio = models.ForeignKey(Envio, on_delete=models.CASCADE)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    posicion_en_bulto = models.CharField(max_length=10, blank=True, 
                                         help_text="Ubicación física en el bulto")
    numero_orden = models.IntegerField(null=True, blank=True, 
                                       help_text="Orden de carga/descarga")
    
    class Meta:
        verbose_name = 'Paquete en envío'
        verbose_name_plural = 'Paquetes en envíos'
        unique_together = [['paquete', 'envio']]