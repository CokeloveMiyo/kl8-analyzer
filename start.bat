@echo off
setlocal enabledelayedexpansion
title K8 Analyzer

REM Force change to script directory
pushd "%~dp0" 2>nul || (
    echo Failed to locate script directory
    pause
    exit /b 1
)

echo.
echo   ==========================================
echo     K8 Analyzer - KuaiLe8 Analyzer
echo   ==========================================
echo.

REM Check requirements.txt exists
if not exist "requirements.txt" (
    echo   [ERROR] requirements.txt not found
    echo   Make sure start.bat is in the project folder
    pause
    exit /b 1
)

REM Find Python
for %%p in (python python3 py) do (
    where %%p >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] Python: %%p
        echo.
        echo   [1/2] Installing dependencies...
        %%p -m pip install -r requirements.txt -q 2>nul
        if !errorlevel! neq 0 (
            echo   [WARN] pip install had issues, trying to continue...
        )
        goto :start
    )
)
echo   [ERROR] Python not found
echo   Install from https://python.org
pause
exit /b 1

:start
REM Create .env if missing
if not exist ".env" (
    copy .env.example .env >nul 2>&1
    echo   [WARN] .env created from template
)

echo   [2/2] Starting server...
echo.
echo   Open: http://127.0.0.1:5000
echo.
python app.py

popd
pause
