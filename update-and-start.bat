@echo off
setlocal

cd /d "%~dp0"

echo ========================================================
echo RCS WORKER PANEL - UPDATE AND START
echo ========================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not available in PATH.
  echo Install Git, then run this file again.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Install Node.js 20.9 or newer, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not installed or not available in PATH.
  echo Install Node.js 20.9 or newer, then run this file again.
  pause
  exit /b 1
)

echo [1/4] Pull latest code...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo [ERROR] git pull failed. Check network, GitHub access, or local changes.
  pause
  exit /b 1
)

echo.
echo [2/4] Install/update dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo.
  echo [3/4] .env.local not found. Creating from .env.example...
  if exist ".env.example" (
    copy ".env.example" ".env.local" >nul
    echo Created .env.local. Please edit RCS_HOST and other settings, then run this file again.
    pause
    exit /b 1
  ) else (
    echo [ERROR] .env.example not found. Cannot create .env.local.
    pause
    exit /b 1
  )
) else (
  echo.
  echo [3/4] .env.local found.
)

echo.
echo Local network URLs:
for /f "delims=" %%F in ('powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }).IPv4Address.IPAddress | Select-Object -Unique"') do (
  echo   https://%%F:3000
)
echo.
echo Local computer:
echo   https://localhost:3000
echo.
echo If the browser shows a certificate warning, choose continue.
echo Keep this window open. Closing it will stop the web app.
echo.

echo [4/4] Starting HTTPS dev server...
call npm run dev:https

echo.
echo Server stopped.
pause
