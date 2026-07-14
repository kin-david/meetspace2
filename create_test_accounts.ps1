# Create 5 Test Accounts Script
$API_URL = "http://localhost:5000/api/auth/register"

$accounts = @(
    @{ name = "John Smith"; email = "john.smith@gmail.com"; phone = "254712345001"; password = "SecurePass@123" },
    @{ name = "Sarah Johnson"; email = "sarah.johnson@hotmail.com"; phone = "254712345002"; password = "SecurePass@123" },
    @{ name = "Michael Brown"; email = "michael.brown@yahoo.com"; phone = "254712345003"; password = "SecurePass@123" },
    @{ name = "Emily Davis"; email = "emily.davis@outlook.com"; phone = "254712345004"; password = "SecurePass@123" },
    @{ name = "David Wilson"; email = "david.wilson@company.co.ke"; phone = "254712345005"; password = "SecurePass@123" }
)

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Creating 5 Test Tenant Accounts                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$createdCount = 0

foreach ($account in $accounts) {
    $body = @{
        full_name = $account.name
        email = $account.email
        phone_number = $account.phone
        password = $account.password
        confirm_password = $account.password
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri $API_URL `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -UseBasicParsing -SkipHttpErrorCheck
        
        if ($response.StatusCode -eq 201) {
            Write-Host "✅ $($account.name) ($($account.email))" -ForegroundColor Green
            $createdCount++
        } else {
            Write-Host "⚠️  $($account.name) - Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $($account.name) - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 300
}

Write-Host "`n✅ Created: $createdCount accounts" -ForegroundColor Green
Write-Host "`nWaiting for database sync..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Querying Database via MySQL                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Query database
$query = "SELECT id, full_name, email, phone_number, created_at FROM meetspace_db.tenants ORDER BY id DESC LIMIT 10;"

try {
    # Use mysql CLI
    $mysqlOutput = & "C:\xampp\mysql\bin\mysql.exe" -u root -h 127.0.0.1 -e $query 2>&1
    Write-Host $mysqlOutput
} catch {
    Write-Host "Could not connect to MySQL via CLI. Using alternative method..." -ForegroundColor Yellow
}
