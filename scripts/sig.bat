@echo off
setlocal

echo Verificando Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo Iniciando Docker Desktop, esto puede tardar un minuto...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    :waitdocker
    timeout /t 5 >nul
    docker info >nul 2>&1
    if errorlevel 1 goto waitdocker
)

echo Levantando base de datos...
docker start sueldos_db >nul 2>&1

echo Iniciando backend...
@REM cd /d C:\_proyectos\Personales\sig\backend
cd /d C:\_proyectos\Personales\sig\backend
start "Sueldos - Backend" cmd /k npm start

timeout /t 4 >nul
start http://localhost:3001

endlocal
