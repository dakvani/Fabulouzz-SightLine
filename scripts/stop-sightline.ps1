# Stop any process listening on port 8080
$connections = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        Write-Host "[SightLine] Stopping process PID $procId on port 8080..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "[SightLine] Process PID $procId terminated." -ForegroundColor Green
        } catch {
            Write-Warning "Could not stop PID $procId: $_"
        }
    }
} else {
    Write-Host "[SightLine] No process is currently listening on port 8080." -ForegroundColor Cyan
}
