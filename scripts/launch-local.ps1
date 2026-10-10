$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js, then open this launcher again.' }
if (-not (Test-Path 'node_modules/vite/bin/vite.js')) {
  $npmFolder = Split-Path (Get-Command npm).Source
  node "$npmFolder/node_modules/npm/bin/npm-cli.js" ci
  if ($LASTEXITCODE -ne 0) { throw 'Dependency setup failed. Open the launcher again to retry.' }
}
node node_modules/typescript/bin/tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'Type checking failed.' }
node node_modules/vite/bin/vite.js build
if ($LASTEXITCODE -ne 0) { throw 'The game build failed.' }
$localUrl = 'http://127.0.0.1:5188/'
try {
  $existingGame = Invoke-WebRequest $localUrl -UseBasicParsing -TimeoutSec 2
  if ($existingGame.Content -match 'Pocket Mechanic') { Start-Process $localUrl; return }
} catch { }
Start-Process $localUrl
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5188 --strictPort
