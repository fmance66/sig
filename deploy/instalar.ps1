# Instala o actualiza el sistema en esta PC a partir del paquete armado con empaquetar.ps1.
# Solo requiere Docker Desktop. Se ejecuta con doble clic en INSTALAR.bat.
#
# Los datos viven en un volumen de Docker: actualizar la app no los toca. El dump
# (sig.dump) solo se restaura si la base esta vacia, salvo -ForzarRestauracion.
param(
    [string]$Destino = "C:\SIG",
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
docker load -i (Join-Path $paquete "sig-app.tar")
Chequear "Fallo docker load."

# Instalaciones hechas cuando el sistema se llamaba "Sueldos": se bajan sus contenedores
# (ocupan el puerto 3001) y se copian sus datos al volumen nuevo. El volumen viejo
# sueldos_datos no se borra, queda como respaldo.
$volViejo = docker volume ls -q --filter "name=^sueldos_datos$"
$volNuevo = docker volume ls -q --filter "name=^sig_datos$"
if ($volViejo -and -not $volNuevo) {
    Paso "Migrando la instalacion anterior (Sueldos) a SIG"
    cmd /c "docker rm -f sueldos_app sueldos_prod_db >nul 2>&1"
    cmd /c "docker network rm sueldos_default >nul 2>&1"
    docker volume create sig_datos | Out-Null
    Chequear "No se pudo crear el volumen sig_datos."
    docker run --rm -v sueldos_datos:/desde -v sig_datos:/hacia postgres:16 cp -a /desde/. /hacia/
    Chequear "No se pudieron copiar los datos de la instalacion anterior."
    $escritorio = [Environment]::GetFolderPath("Desktop")
    Remove-Item (Join-Path $escritorio "Sueldos.url") -ErrorAction SilentlyContinue
    if ((Test-Path "C:\Sueldos") -and ($Destino -ne "C:\Sueldos")) { Remove-Item -Recurse -Force "C:\Sueldos" }
}

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
EsperarSano "sig_db"

$dump = Join-Path $paquete "sig.dump"
if (Test-Path $dump) {
    $tablas = docker exec sig_db psql -U sueldos -d sueldos -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    Chequear "No se pudo consultar la base."
    if ([int]$tablas -eq 0 -or $ForzarRestauracion) {
        Paso "Restaurando datos desde sig.dump"
        docker cp $dump sig_db:/tmp/sig.dump
        Chequear "No se pudo copiar el dump al contenedor."
        docker exec sig_db pg_restore -U sueldos -d sueldos --clean --if-exists --no-owner /tmp/sig.dump
        # pg_restore devuelve != 0 tambien por avisos menores; no cortamos, pero avisamos.
        if ($LASTEXITCODE -ne 0) { Write-Host "pg_restore termino con avisos, revisar los mensajes de arriba." -ForegroundColor Yellow }
        docker exec sig_db rm /tmp/sig.dump | Out-Null
    } else {
        Write-Host "La base ya tiene datos: no se restaura sig.dump (usar -ForzarRestauracion para pisarlos)." -ForegroundColor Yellow
    }
}

Paso "Aplicando migraciones pendientes"
docker exec sig_app node /app/db/migrate.js
if ($LASTEXITCODE -ne 0) { Write-Host "Las migraciones fallaron, revisar los mensajes de arriba." -ForegroundColor Yellow }

Paso "Creando acceso directo en el escritorio"
$escritorio = [Environment]::GetFolderPath("Desktop")
[IO.File]::WriteAllText((Join-Path $escritorio "SIG.url"), "[InternetShortcut]`r`nURL=http://localhost:3001`r`n", [Text.Encoding]::ASCII)

Paso "Listo"
Write-Host "Abrir 'SIG' en el escritorio o http://localhost:3001" -ForegroundColor Green
Write-Host "La app arranca sola junto con Docker Desktop (dejar activado 'Start Docker Desktop when you sign in')."
