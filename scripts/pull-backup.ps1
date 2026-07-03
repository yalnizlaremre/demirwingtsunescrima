# Sunucudaki en guncel yedekleri (db + uploads) bu bilgisayara indirir.
# Kullanim: .\scripts\pull-backup.ps1

$ServerHost = "root@188.34.180.17"
$RemoteDir = "/opt/wteo/backups"
$LocalDir = Join-Path $PSScriptRoot "..\backups"

if (-not (Test-Path $LocalDir)) {
    New-Item -ItemType Directory -Path $LocalDir | Out-Null
}

Write-Host "Sunucudaki en yeni yedekler bulunuyor..."
$latestDb = ssh $ServerHost "ls -t $RemoteDir/db_*.sql.gz 2>/dev/null | head -n1"
$latestUploads = ssh $ServerHost "ls -t $RemoteDir/uploads_*.tar.gz 2>/dev/null | head -n1"

if ([string]::IsNullOrWhiteSpace($latestDb)) {
    Write-Host "Sunucuda henuz db yedegi bulunamadi." -ForegroundColor Yellow
} else {
    Write-Host "Indiriliyor: $latestDb"
    scp "${ServerHost}:${latestDb}" $LocalDir
}

if ([string]::IsNullOrWhiteSpace($latestUploads)) {
    Write-Host "Sunucuda henuz uploads yedegi bulunamadi." -ForegroundColor Yellow
} else {
    Write-Host "Indiriliyor: $latestUploads"
    scp "${ServerHost}:${latestUploads}" $LocalDir
}

Write-Host "Tamamlandi. Yerel yedek klasoru: $LocalDir" -ForegroundColor Green
