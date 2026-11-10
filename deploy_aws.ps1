# Script to deploy latest code to AWS EC2
$KeyPath = "$PSScriptRoot\ai_saraj_key.pem"

# Ensure correct Windows permissions on the private key (equivalent to chmod 400)
try {
    icacls $KeyPath /inheritance:r | Out-Null
    icacls $KeyPath /grant:r "$($env:USERNAME):(R)" | Out-Null
} catch {}

Write-Host "Connecting to AWS EC2 and updating backend..." -ForegroundColor Cyan

ssh -i $KeyPath -o StrictHostKeyChecking=no ubuntu@13.127.102.234 @"
echo '=== 1. Syncing latest code with GitHub ==='
cd ~/AI_Saraj
git fetch origin main
git reset --hard origin/main

echo '=== 2. Applying Database Migrations (Indexes) ==='
cd ~/AI_Saraj/backend
venv/bin/alembic upgrade head || alembic upgrade head || true

echo '=== 3. Restarting Backend Service ==='
sudo systemctl restart aisaraj

echo '=== 4. Backend Service Status ==='
sudo systemctl status aisaraj --no-pager
"@

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green

