# Arma en deploy\paquete\ todo lo necesario para instalar en otra PC que solo tenga
# Docker Desktop: imagenes (app + postgres), compose, instalador y opcionalmente los datos.
#
# Uso (desde la raiz del repo, con Docker Desktop corriendo):
#   powershell -ExecutionPolicy Bypass -File deploy\empaquetar.ps1            (solo la app, para actualizar)
#   powershell -ExecutionPolicy Bypass -File deploy\empaquetar.ps1 -ConDatos  (app + dump de la base local)
param(
    [switch]$ConDatos,
    [string]$Salida = (Join-Path $PSScriptRoot "paquete")
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Chequear($mensaje) { if ($LASTEXITCODE -ne 0) { throw $mensaje } }

cmd /c "docker info >nul 2>&1"
if ($LASTEXITCODE -ne 0) { throw "Docker Desktop no esta corriendo." }

# npm.cmd en vez de npm: npm.ps1 puede estar bloqueado por la ExecutionPolicy.
function Npm($carpeta, [string[]]$argumentos) {
    Push-Location $carpeta
    try {
        & npm.cmd @argumentos
        Chequear "Fallo 'npm $($argumentos -join ' ')' en $carpeta"
    } finally {
        Pop-Location
    }
}

Paso "Compilando frontend"
$frontend = Join-Path $raiz "frontend"
if (-not (Test-Path (Join-Path $frontend "node_modules"))) { Npm $frontend @("install") }
Npm $frontend @("run", "build")

# Carpeta aparte para no tocar el node_modules de desarrollo (que incluye devDependencies).
Paso "Instalando dependencias de produccion del backend"
$build = Join-Path $PSScriptRoot ".build\backend"
if (Test-Path $build) { Remove-Item -Recurse -Force $build }
New-Item -ItemType Directory -Force $build | Out-Null
Copy-Item (Join-Path $raiz "backend\package.json"), (Join-Path $raiz "backend\package-lock.json") $build
Npm $build @("ci", "--omit=dev", "--no-audit", "--no-fund")

Paso "Construyendo imagen sig-app"
docker build -t sig-app:latest $raiz
Chequear "Fallo docker build."

Paso "Descargando postgres:16 (para que la otra PC no necesite internet)"
docker pull postgres:16
Chequear "Fallo docker pull postgres:16."

if (Test-Path $Salida) { Remove-Item -Recurse -Force $Salida }
New-Item -ItemType Directory -Force $Salida | Out-Null

Paso "Exportando imagenes a sig-app.tar (tarda un rato)"
docker save -o (Join-Path $Salida "sig-app.tar") sig-app:latest postgres:16
Chequear "Fallo docker save."

Copy-Item (Join-Path $PSScriptRoot "docker-compose.yml") $Salida
Copy-Item (Join-Path $PSScriptRoot "instalar.ps1") $Salida
Copy-Item (Join-Path $PSScriptRoot "INSTALAR.bat") $Salida

if ($ConDatos) {
    Paso "Exportando datos de la base local (sueldos_db)"
    docker exec sueldos_db pg_dump -U sueldos -d sueldos -F c -f /tmp/sueldos.dump
    Chequear "Fallo pg_dump. Esta corriendo el contenedor sueldos_db?"
    docker cp sueldos_db:/tmp/sueldos.dump (Join-Path $Salida "sig.dump")
    Chequear "No se pudo copiar el dump."
    docker exec sueldos_db rm /tmp/sueldos.dump | Out-Null

    # El instalador corre db/migrate.js: si la base de origen no tiene registradas
    # todas las migraciones, en destino las reintentaria sobre datos que ya las tienen.
    $archivos = (Get-ChildItem (Join-Path $raiz "db\postgresql\migrations") -Filter *.sql).Count
    $registradas = docker exec sueldos_db psql -U sueldos -d sueldos -tAc "SELECT count(*) FROM schema_migrations"
    if ($LASTEXITCODE -ne 0 -or [int]$registradas -ne $archivos) {
        Write-Host "ATENCION: schema_migrations tiene '$registradas' filas y hay $archivos migraciones. Correr 'node db/migrate.js' en esta PC antes de empaquetar." -ForegroundColor Yellow
    }
}

$tam = [math]::Round(((Get-ChildItem $Salida | Measure-Object Length -Sum).Sum / 1MB))
Paso "Listo: $Salida ($tam MB)"
Write-Host "Copiar esa carpeta a la otra PC y hacer doble clic en INSTALAR.bat." -ForegroundColor Green
if ($ConDatos) { Write-Host "Incluye datos reales (sueldos, contabilidad, IVA): pasarla por USB o red local, no por canales publicos." -ForegroundColor Yellow }
