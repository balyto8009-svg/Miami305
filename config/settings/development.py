"""
ConfiguraciÃ³n para entorno de desarrollo
"""
from .base import *

DEBUG = True

# Permitir todos los orÃ­genes en desarrollo (SOLO DESARROLLO)
CORS_ALLOW_ALL_ORIGINS = True

# Mostrar emails en consola en lugar de enviarlos
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Logging para desarrollo
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}