# Instala o actualiza el sistema en esta PC a partir del paquete armado con empaquetar.ps1.
# Solo requiere Docker Desktop. Se ejecuta con doble clic en INSTALAR.bat.
#
# Los datos viven en un volumen de Docker: actualizar la app no los toca. El dump
# (sueldos.dump) solo se restaura si la base esta vacia, salvo -ForzarRestauracion.
param(
    [string]$Destino = "C:\Sueldos",
    [switch]$ForzarRestauracion
)

$ErrorActionPreference = "Stop"
$paquete = $PSScriptRoot

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Chequear($mensaje) { if ($LASTEXITCODE -ne 0) { throw $mensaje } }

function EsperarSano($contenedor) {
    for ($i = 0; $i -lt 60; $i++) {
        $estado = cmd /c "docker inspect -f {{.State.Health.Status}} $contenedor 2>nul"
        if ($estado -eq "healthy") { return }
        Start-Sleep -Seconds 2
    }
    throw "El contenedor $contenedor no quedo listo. Revisar con: docker logs $contenedor"
}

Paso "Verificando Docker Desktop"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop no esta instalado."
}
cmd /c "docker info >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
    $exe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $exe) { Start-Process $exe }
    Write-Host "Esperando a que inicie Docker Desktop..."
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 5
        cmd /c "docker info >nul 2>&1"
        if ($LASTEXITCODE -eq 0) { break }
    }
    cmd /c "docker info >nul 2>&1"
    Chequear "Docker Desktop no arranco. Abrirlo a mano y volver a ejecutar."
}

Paso "Cargando imagenes (tarda un rato)"
docker load -i (Join-Path $paquete "sueldos-app.tar")
Chequear "Fallo docker load."

Paso "Preparando $Destino"
New-Item -ItemType Directory -Force $Destino | Out-Null
Copy-Item (Join-Path $paquete "docker-compose.yml") $Destino -Force
$envPath = Join-Path $Destino ".env"
if (-not (Test-Path $envPath)) {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })
    [IO.File]::WriteAllText($envPath, "SESSION_SECRET=$secret`n", [Text.Encoding]::ASCII)
}

Paso "Levantando la aplicacion"
Push-Location $Destino
try {
    docker compose up -d
    Chequear "Fallo docker compose up."
} finally {
    Pop-Location
}
EsperarSano "sueldos_prod_db"

$dump = Join-Path $paquete "sueldos.dump"
if (Test-Path $dump) {
    $tablas = docker exec sueldos_prod_db psql -U sueldos -d sueldos -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    Chequear "No se pudo consultar la base."
    if ([int]$tablas -eq 0 -or $ForzarRestauracion) {
        Paso "Restaurando datos desde sueldos.dump"
        docker cp $dump sueldos_prod_db:/tmp/sueldos.dump
        Chequear "No se pudo copiar el dump al contenedor."
        docker exec sueldos_prod_db pg_restore -U sueldos -d sueldos --clean --if-exists --no-owner /tmp/sueldos.dump
        # pg_restore devuelve != 0 tambien por avisos menores; no cortamos, pero avisamos.
        if ($LASTEXITCODE -ne 0) { Write-Host "pg_restore termino con avisos, revisar los mensajes de arriba." -ForegroundColor Yellow }
        docker exec sueldos_prod_db rm /tmp/sueldos.dump | Out-Null
    } else {
        Write-Host "La base ya tiene datos: no se restaura sueldos.dump (usar -ForzarRestauracion para pisarlos)." -ForegroundColor Yellow
    }
}

Paso "Aplicando migraciones pendientes"
docker exec sueldos_app node /app/db/migrate.js
if ($LASTEXITCODE -ne 0) { Write-Host "Las migraciones fallaron, revisar los mensajes de arriba." -ForegroundColor Yellow }

Paso "Creando acceso directo en el escritorio"
$escritorio = [Environment]::GetFolderPath("Desktop")
[IO.File]::WriteAllText((Join-Path $escritorio "Sueldos.url"), "[InternetShortcut]`r`nURL=http://localhost:3001`r`n", [Text.Encoding]::ASCII)

Paso "Listo"
Write-Host "Abrir 'Sueldos' en el escritorio o http://localhost:3001" -ForegroundColor Green
Write-Host "La app arranca sola junto con Docker Desktop (dejar activado 'Start Docker Desktop when you sign in')."
