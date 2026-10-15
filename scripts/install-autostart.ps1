# Install Autostart for Fabulouzz SightLine
$projectDir = Split-Path -Parent $PSScriptRoot
$vbsPath = Join-Path $PSScriptRoot "start-sightline-silent.vbs"
$startupDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)
$shortcutPath = Join-Path $startupDir "FabulouzzSightLine.lnk"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Installing Fabulouzz SightLine Autostart " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Project Directory: $projectDir"
Write-Host "VBS Runner:        $vbsPath"
Write-Host "Startup Shortcut:  $shortcutPath"

# 1. Create Windows Startup folder shortcut
try {
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "wscript.exe"
    $shortcut.Arguments = "`"$vbsPath`""
    $shortcut.WorkingDirectory = $PSScriptRoot
    $shortcut.Description = "Fabulouzz SightLine Command Center Autostart"
    $shortcut.Save()
    Write-Host "[✓] Windows Startup Shortcut successfully created at:" -ForegroundColor Green
    Write-Host "    $shortcutPath" -ForegroundColor Gray
} catch {
    Write-Warning "Failed to create startup shortcut: $_"
}

# 2. Register Windows Scheduled Task for logon resilience
$taskName = "FabulouzzSightLine"
try {
    $cmd = "schtasks /Create /TN `"$taskName`" /TR `"wscript.exe `\`"$vbsPath`\`"`" /SC ONLOGON /F"
    cmd.exe /c $cmd
    Write-Host "[✓] Scheduled Task '$taskName' registered successfully." -ForegroundColor Green
} catch {
    Write-Host "[!] Note: Scheduled task creation encountered: $_ (Startup shortcut is active)" -ForegroundColor Yellow
}

Write-Host "`nSightLine will now automatically start on every Windows reboot / logon." -ForegroundColor Green
Write-Host "It will run quietly in the background on http://localhost:8080" -ForegroundColor Green
