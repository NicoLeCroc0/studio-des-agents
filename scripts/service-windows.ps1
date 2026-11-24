# Le studio toujours allumé sur un PC Windows : il démarre tout seul à l'ouverture de ta session,
# sans fenêtre, et redémarre tout seul s'il s'arrête. Plus besoin de « npm start » à chaque fois.
#
#   npm run service:windows             installer (ou mettre à jour après un « git pull »)
#   npm run service:windows -- -Stop    l'arrêter et ne plus le démarrer tout seul
param([switch]$Stop)
$ErrorActionPreference = 'Stop'
$Name = 'Studio des agents'
$Dir = Split-Path -Parent $PSScriptRoot

if ($Stop) {
  Stop-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*server*index.ts*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Write-Host '  ✓ Le studio est arrêté et ne démarrera plus tout seul.'
  exit 0
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Host '  ✗ Node.js est introuvable : installe-le (https://nodejs.org).'; exit 1 }
$claude = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claude) { Write-Host '  ⚠ Claude Code est introuvable : le studio tournera en démo (installe-le, puis relance cette commande).' }

Write-Host '  … Je construis le studio'
Push-Location $Dir
node scripts/check-node.mjs
npx vite build --logLevel warn
Pop-Location

# La boucle : relance le studio s'il s'arrête (toutes les 10 secondes au plus)
$loop = Join-Path $Dir 'scripts\studio-loop.ps1'
$log = Join-Path $env:LOCALAPPDATA 'studio-des-agents.log'
@"
`$env:CLAUDE_BIN = '$claude'
Set-Location '$Dir'
while (`$true) {
  & '$node' server/index.ts *>> '$log'
  Start-Sleep -Seconds 10
}
"@ | Set-Content -Encoding UTF8 $loop

$action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$loop`"" -WorkingDirectory $Dir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -MultipleInstances IgnoreNew
Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Settings $settings -Description 'Le Studio des agents, toujours allumé' | Out-Null
Start-ScheduledTask -TaskName $Name

Write-Host ''
Write-Host '  ✓ Le studio tourne tout seul : http://localhost:4850'
Write-Host '    Il redémarre à chaque ouverture de session (et s''il plante).'
Write-Host "    Son journal : $log"
Write-Host '    Pour l''arrêter : npm run service:windows -- -Stop'
Write-Host ''
Write-Host '  Pour y accéder depuis ton iPhone : voir « Depuis ton téléphone » dans le README (Tailscale + mot de passe).'
