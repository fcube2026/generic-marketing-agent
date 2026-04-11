@echo off
:: This script must be run as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting admin privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)
netsh advfirewall firewall delete rule name="Expo Metro Bundler" >nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro Bundler" dir=in action=allow protocol=TCP localport=8081-8100
echo.
echo ✅ Firewall rule added! Port 8081 is now open.
echo You can close this window.
pause
