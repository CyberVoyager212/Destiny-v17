@echo off
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "SRC=%ROOT%\src"
set "NODE_VER=18.20.8"

:: nvm varsa uygun node s�r�m�n� kullan / y�kle
where nvm >nul 2>&1
if %errorlevel% equ 0 (
  nvm ls | findstr "%NODE_VER%" >nul 2>&1
  if %errorlevel% neq 0 (
    nvm install %NODE_VER%
  )
  nvm use %NODE_VER% >nul 2>&1
)

:: PowerShell'i yeni pencerede �al??t?r (bu .bat hemen kapan?r)
start "" powershell -ExecutionPolicy Bypass -File "src\run_launcher.ps1"

exit /b 0


