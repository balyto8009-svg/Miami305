"""
Configuración principal de Django para Miami305
Sistema de Gestión de Envíos a Cuba
"""

import os
from pathlib import Path
from dotenv import load_dotenv
DEBUG = True 
# ============================================
# CARGAR VARIABLES DE ENTORNO
# ============================================
# Buscar el archivo .env en la raíz del proyecto
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

# ============================================
# DIRECTORIO BASE DEL PROYECTO
# ============================================
BASE_DIR = Path(__file__).resolve().parent.parent

# ============================================
# SEGURIDAD
# ============================================
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-clave-temporal-para-desarrollo')

# Modo debug - Solo activar en desarrollo
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'

# Hosts permitidos
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ============================================
# APLICACIONES INSTALADAS
# ============================================
INSTALLED_APPS = [
    # Django Admin y aplicaciones base
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
#    'leaflet',
    
    # Aplicaciones de terceros
    'rest_framework',                # Django REST Framework
    'rest_framework.authtoken',      # Tokens de autenticaciÃ³n
    'corsheaders',                   # CORS para API
    'django_filters',                # Filtros para API
    'rest_framework_simplejwt',  # Agregar
    
    # Aplicaciones del proyecto (nuestras apps)
    'apps.users',                    # Gestión de usuarios y autenticación
    'apps.core',                     # Núcleo del sistema (paquetes, clientes)
    'apps.tracking',                 # Seguimiento de envíos
    'apps.reports',                  # Reportes y estadísticas
]

# ============================================
# MIDDLEWARE
# ============================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS - DEBE IR ARRIBA
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Middleware personalizados
    # 'apps.core.middleware.AuditMiddleware',  # Para auditoría de acciones
    # 'apps.core.middleware.RequestLogMiddleware',  # Para logging de peticiones
]

# ============================================
# CONFIGURACIÓN DE URLS
# ============================================
ROOT_URLCONF = 'config.urls'

# ============================================
# TEMPLATES
# ============================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'templates'),  # Templates globales
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                # Context processors personalizados
                # 'apps.core.context_processors.empresa_info',
            ],
        },
    },
]

# ============================================
# WSGI
# ============================================
WSGI_APPLICATION = 'config.wsgi.application'

# ============================================
# BASE DE DATOS
# ============================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'envios_cuba'),
        'USER': os.getenv('DB_USER', 'envios_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'admin123'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # Mantener conexiones abiertas
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# ============================================
# VALIDACIÓN DE CONTRASEÑAS
# ============================================
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 3,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ============================================
# MODELO DE USUARIO PERSONALIZADO
# ============================================
AUTH_USER_MODEL = 'users.Usuario'

# ============================================
# INTERNACIONALIZACIÓN
# ============================================
LANGUAGE_CODE = os.getenv('LANGUAGE_CODE', 'es-es')
TIME_ZONE = os.getenv('TIME_ZONE', 'America/New_York')
USE_I18N = True
USE_TZ = True

# ============================================
# ARCHIVOS ESTÁTICOS
# ============================================
STATIC_URL = '/static/'
STATIC_ROOT = os.getenv('STATIC_ROOT', os.path.join(BASE_DIR, 'staticfiles'))
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# ============================================
# ARCHIVOS MULTIMEDIA (Fotos de paquetes)
# ============================================
MEDIA_URL = '/media/'
MEDIA_ROOT = os.getenv('MEDIA_ROOT', os.path.join(BASE_DIR, 'media'))

# ============================================
# CONFIGURACIÓN DE DJANGO REST FRAMEWORK
# ============================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # JWT
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('API_PAGE_SIZE', 20)),
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',  # Solo desarrollo
    ],
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# ============================================
# CONFIGURACIÓN DE JWT
# ============================================
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# ============================================
# CORS (Cross-Origin Resource Sharing)
# ============================================
#CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

# En desarrollo, permitir todos los orígenes (SOLO DESARROLLO)
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
# Métodos permitidos
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Headers permitidos
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ============================================
# EMAIL
# ============================================
# Verificar si hay configuración de email
if os.getenv('EMAIL_HOST_USER'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@miami305.com')
else:
    # Si no hay configuraciÃ³n, usar consola (desarrollo)
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'noreply@miami305.com'

# ============================================
# CELERY - TAREAS ASÍNCRONAS (OPCIONAL)
# ============================================
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# ============================================
# LOGGING
# ============================================
LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG' if DEBUG else 'INFO')
LOG_FILE = os.getenv('LOG_FILE', os.path.join(BASE_DIR, 'logs', 'django.log'))

# Crear directorio de logs si no existe
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_FILE,
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
    },
}

# ============================================
# CONFIGURACIÓN DE SEGURIDAD
# ============================================
# HTTPS (solo en producción)
if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
    CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False') == 'True'
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', 0))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False') == 'True'
    SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'False') == 'True'

# ============================================
# CONFIGURACIONES ADICIONALES
# ============================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# INFORMACIÓN DE LA EMPRESA (para el contexto)
# ============================================
EMPRESA_INFO = {
    'nombre': os.getenv('EMPRESA_NOMBRE', 'Miami305 Envíos'),
    'direccion': os.getenv('EMPRESA_DIRECCION', '123 Main Street, Miami, FL 33101'),
    'telefono': os.getenv('EMPRESA_TELEFONO', '+1 (305) 555-0123'),
    'email': os.getenv('EMPRESA_EMAIL', 'info@miami305.com'),
    'sitio_web': os.getenv('EMPRESA_SITIO_WEB', 'https://www.miami305.com'),
}
# ============================================
# CONFIGURACION DE GEOPOSISIÓN
# ============================================
# ==========================================
# LEAFLET CONFIGURATION (OpenStreetMap - GRATUITO)
# ==========================================
#LEAFLET_CONFIG = {
#    'DEFAULT_CENTER': (20.89225037, -76.25554883),  # Direccion de Recepción
#    'DEFAULT_ZOOM': 12,
#    'MIN_ZOOM': 3,
#    'MAX_ZOOM': 20,
#    'ATTRIBUTION_PREFIX': 'Mapa OpenStreetMap'
#    'TILES': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
#    'SPATIAL_EXTENT': (-90, -180, 90, 180),
#}
# GEOPOSITION_BACKEND = 'leaflet'
# ============================================
# CONFIGURACIÓN DE TARIFAS
# ============================================
TARIFAS = {
    'base': float(os.getenv('TARIFA_BASE', 15.00)),
    'kg_extra': float(os.getenv('TARIFA_KG_EXTRA', 2.50)),
    'peso_base': float(os.getenv('PESO_BASE', 2.00)),
    'sobrecargo_provincia_lejana': float(os.getenv('SOBRECARGO_PROVINCIA_LEJANA', 3.00)),
    'provincias_lejanas': ['GTM', 'SCU', 'HOL', 'GRM'],  # Provincias con sobrecargo
}

# ============================================
# FIN DE LA CONFIGURACIÓN
# ============================================
print(f"ð§ Configuración cargada: {'DESARROLLO' if DEBUG else 'PRODUCCIÓN'}")
print(f"ð Directorio base: {BASE_DIR}")
print(f"ðï¸  Base de datos: {DATABASES['default']['NAME']}")
print(f"ð§ Email: {'Configurado' if EMAIL_HOST_USER else 'Consola (desarrollo)'}")