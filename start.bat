@echo off
chcp 65001 >nul
title K8 Analyzer
cd /d "%~dp0"

echo.
echo   ┌──────────────────────────────────────────┐
echo   │  K8 Analyzer - 快乐8智能分析系统          │
echo   └──────────────────────────────────────────┘
echo.

REM Check Python
echo [1/3] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

REM Install dependencies
echo [2/3] Installing dependencies...
pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

REM Check .env
echo [3/3] Checking config...
if not exist .env (
    echo [WARN] .env not found, creating from .env.example...
    copy .env.example .env >nul
    echo [WARN] Please edit .env to set your OPENAI_API_KEY
)

REM Start
echo.
echo   Starting server...
echo.
python app.py

pause
