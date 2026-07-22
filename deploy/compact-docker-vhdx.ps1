# Compact Docker Desktop's docker_data.vhdx to reclaim disk space on C:.
# RUN AS ADMINISTRATOR (right-click PowerShell -> Run as administrator, then run this file).
# Safe: cleanly stops the translate stack, shuts down Docker/WSL, compacts the vhdx via
# diskpart, restarts Docker Desktop, and the stack auto-restarts (restart: unless-stopped).

$ErrorActionPreference = 'Stop'
$vhdx        = "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"
$deployDir   = "C:\project\miniserver-platform\translate_app\deploy"
$dockerExe   = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

function Require-Admin {
    $p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "This script must be run in an ELEVATED (Administrator) PowerShell."
    }
}
Require-Admin

if (-not (Test-Path $vhdx)) { throw "vhdx not found: $vhdx" }
$before = (Get-Item $vhdx).Length / 1GB
Write-Host ("vhdx size BEFORE: {0:N1} GB" -f $before) -ForegroundColor Cyan

# 1) Clean-stop the stack so MySQL flushes (avoids abrupt-kill corruption).
Write-Host "Stopping translate stack cleanly..." -ForegroundColor Yellow
Push-Location $deployDir
try { docker compose stop } catch { Write-Warning "compose stop failed (continuing): $_" }
Pop-Location

# 2) Fully quit Docker Desktop + WSL so the vhdx file lock is released.
Write-Host "Shutting down Docker Desktop + WSL..." -ForegroundColor Yellow
Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process 'com.docker.backend','com.docker.service','vpnkit','dockerd' -ErrorAction SilentlyContinue | Stop-Process -Force
wsl --shutdown
Start-Sleep -Seconds 8   # let the file lock release

# 3) Compact the vhdx with diskpart (read-only attach = safe, no data touched).
$dp = @"
select vdisk file="$vhdx"
attach vdisk readonly
compact vdisk
detach vdisk
exit
"@
$tmp = Join-Path $env:TEMP "compact-docker-vhdx.txt"
$dp | Out-File -FilePath $tmp -Encoding ascii
Write-Host "Compacting vhdx (this can take a few minutes)..." -ForegroundColor Yellow
diskpart /s $tmp
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

$after = (Get-Item $vhdx).Length / 1GB
Write-Host ("vhdx size AFTER:  {0:N1} GB   (reclaimed {1:N1} GB)" -f $after, ($before - $after)) -ForegroundColor Green

# 4) Restart Docker Desktop; the stack auto-restarts (restart: unless-stopped).
Write-Host "Restarting Docker Desktop..." -ForegroundColor Yellow
Start-Process $dockerExe
Write-Host "Waiting for Docker engine to come back..." -ForegroundColor Yellow
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 6
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { Write-Host "Docker engine READY." -ForegroundColor Green; break }
}
# Ensure the stack is up (in case any container wasn't set to auto-restart).
Push-Location $deployDir
try { docker compose up -d } catch { Write-Warning "compose up failed: $_" }
Pop-Location

Write-Host "Done. Free space on C::" -ForegroundColor Cyan
Get-PSDrive C | Select-Object Used, Free
