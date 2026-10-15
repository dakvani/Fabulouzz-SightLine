# Uninstall Autostart for Fabulouzz SightLine
$startupDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)
$shortcutPath = Join-Path $startupDir "FabulouzzSightLine.lnk"
$taskName = "FabulouzzSightLine"

Write-Host "[SightLine] Removing Windows Startup Shortcut..." -ForegroundColor Yellow
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "[✓] Removed $shortcutPath" -ForegroundColor Green
} else {
    Write-Host "Startup shortcut was not found." -ForegroundColor Gray
}

Write-Host "[SightLine] Removing Scheduled Task '$taskName'..." -ForegroundColor Yellow
schtasks /Delete /TN $taskName /F 2>&1 | Out-Null
Write-Host "[✓] Uninstalled autostart entries." -ForegroundColor Green
