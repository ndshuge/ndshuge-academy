@echo off
rem ===== Physics Academy: prepare + build =====
rem Double-click this file to build the academy single-file HTML.
cd /d "%~dp0"
echo.
echo [1/3] Preparing engine files from chip2-build template ...
python prep.py
if errorlevel 1 goto err
echo.
echo [2/3] Building single-file academy HTML ...
python build.py
if errorlevel 1 goto err
echo.
echo [3/3] DONE. Output file: phys-preview.html (in ..\)
echo.
pause
exit /b 0
:err
echo.
echo BUILD FAILED. Please read the messages above.
pause
exit /b 1
