@echo off
title Sync Outer Python Site
cd /d "%~dp0"
python "%~dp0sync_outer_python.py"
echo.
pause
