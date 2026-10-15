@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo                       StudyOS - Version 1.0                          
echo          Premium Personal Study Productivity PWA (Laptop & Mobile)    
echo =====================================================================
echo.

:: 1. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from python.org and retry.
    pause
    exit /b 1
)

:: 2. Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from nodejs.org and retry.
    pause
    exit /b 1
)

:: 3. Setup Backend Environment
echo [*] Checking Backend virtual environment...
if not exist "backend\venv" (
    echo [*] Creating virtual environment at backend\venv...
    python -m venv backend\venv
)

if not exist "backend\.env" (
    echo [*] Initializing backend\.env from template...
    copy "backend\.env.example" "backend\.env" >nul
)

echo [*] Verifying and applying Django database migrations...
backend\venv\Scripts\python.exe backend\manage.py migrate --noinput
if %errorlevel% neq 0 (
    echo [WARNING] Migration check failed. Checking database configuration...
)

:: 4. Start Django Backend Server in new window
echo [*] Launching StudyOS Django REST API on http://127.0.0.1:8000...
start "StudyOS - Backend API" cmd /k "title StudyOS Backend && backend\venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000"

:: 5. Start Next.js Frontend PWA in new window
echo [*] Launching StudyOS Next.js PWA on http://localhost:3000...
start "StudyOS - Frontend PWA" cmd /k "title StudyOS Frontend && cd frontend && npm run dev"

echo.
echo =====================================================================
echo StudyOS is now booting up!
echo.
echo   Frontend PWA: http://localhost:3000
echo   Backend REST: http://127.0.0.1:8000/api/
echo.
echo Tip: Open Chrome/Edge on laptop or Android and click "Install StudyOS"
echo To stop StudyOS, close both terminal windows.
echo =====================================================================
echo.

pause
