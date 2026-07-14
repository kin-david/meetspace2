@echo off
echo ================================================
echo   MEETSPACE - Project Startup Script
echo ================================================
echo.

set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo Step 1: Starting XAMPP Services...
echo Starting MySQL...
cd C:\xampp
start xampp-control.exe

timeout /t 3 /nobreak

echo.
echo Step 2: Starting Backend Server...
start cmd /k "cd /d ""%PROJECT_ROOT%\backend"" && npm install && node server.js"

timeout /t 5 /nobreak

echo.
echo Step 3: Starting Frontend Server...
start cmd /k "cd /d ""%PROJECT_ROOT%"" && python -m http.server 5500"

timeout /t 3 /nobreak

echo.
echo ================================================
echo   Services Starting...
echo ================================================
echo.
echo Frontend:  http://localhost:5500
echo Backend:   http://localhost:5000
echo Database:  localhost:3306
echo.
echo Press any key to continue...
pause

exit
