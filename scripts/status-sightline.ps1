# Status check for Fabulouzz SightLine service
$port = 8080
$url = "http://localhost:$port/"

$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "[SightLine] Active and listening on port $port (PID: $($conn.OwningProcess), Name: $($proc.ProcessName))" -ForegroundColor Green
    
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -eq 200) {
            Write-Host "[SightLine] Health Check PASSED: $url returned 200 OK" -ForegroundColor Green
        } else {
            Write-Host "[SightLine] Health Check returned status code: $($resp.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[SightLine] Health Check warning: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[SightLine] Inactive - No service is listening on port $port." -ForegroundColor Red
}
