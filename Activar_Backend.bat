@echo off
echo ========================================
echo   MIAMI305 - Sistema de Envios a Cuba
echo ========================================
echo.
echo Accediendo a la carpete del proyecto...
echo d:\Universidad\Tesis\Miami305\
d:
cd \Universidad\Tesis\Miami305\
echo.
echo Activando entorno virtual...
call D:\Universidad\Tesis\Miami305\venv\Scripts\activate.bat
echo.
echo Entorno activado correctamente!
echo.
echo Comandos disponibles:
echo   python manage.py runserver    - Iniciar servidor
echo   python manage.py makemigrations - Crear migraciones
echo   python manage.py migrate      - Aplicar migraciones
echo   python manage.py createsuperuser - Crear administrador
echo   python manage.py test         - Ejecutar pruebas
echo.
echo Para salir del entorno: deactivate
echo.
COLOR C
echo Iniciando el servidor Backend...
echo   python manage.py runserver
python manage.py runserver
