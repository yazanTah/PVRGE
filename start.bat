@echo off
title FlowPurger - C2PA & SynthID Video Cleaner
echo ===================================================
echo     FlowPurger - C2PA & SynthID AI Video Cleaner
echo   Removes C2PA manifests & neutralizes SynthID
echo ===================================================
echo.

:: Check if Python exists
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

:: Check if FFmpeg exists, if not check winget directory
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe" (
        set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
    ) else (
        echo [WARNING] ffmpeg was not found in PATH. Make sure FFmpeg is installed.
    )
)

echo [1/3] Installing/verifying Python dependencies...
pip install -r requirements.txt --quiet

echo.
echo [2/3] Launching Web Interface on http://localhost:8000 ...
start "" http://localhost:8000

echo [3/3] Starting FlowPurger local engine...
python main.py

pause
