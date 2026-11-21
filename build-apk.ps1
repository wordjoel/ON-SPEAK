$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Capacitor 7 exige JDK 21. Usa o JDK portátil baixado, se existir.
$portableJdk = Join-Path $env:TEMP 'opencode\jdk21\jdk-21.0.13.1+2'
if (Test-Path $portableJdk) {
  $env:JAVA_HOME = $portableJdk
  $env:PATH = "$portableJdk\bin;$env:PATH"
}
if (-not $env:JAVA_HOME) { throw 'Defina JAVA_HOME apontando para um JDK 21.' }

Push-Location $root
try {
  npm run build
  npx cap sync android
  Push-Location (Join-Path $root 'android')
  try {
    .\gradlew.bat assembleDebug --no-daemon
    $apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
    $dest = Join-Path $root 'LinguaViva-debug.apk'
    Copy-Item $apk $dest -Force
    Write-Host "`nAPK pronto: $dest"
  } finally { Pop-Location }
} finally { Pop-Location }
