@echo off
rem Physics Academy - one-click build + local deploy + preview
rem Step 1: run build.py (inject all chapters into the shell)
rem Step 2: copy result to phys.html (the name the portal card points to)
rem Step 3: open it in your browser

cd /d %~dp0

python build.py
if errorlevel 1 (
    echo [RETRY] "python" failed, trying "py" launcher ...
    py build.py
    if errorlevel 1 goto fail
)

copy /y "..\phys-preview.html" "..\phys.html" >nul
if errorlevel 1 goto fail

echo.
echo [OK] Build finished: phys.html with all chapters.
echo      Portal card "Physics Academy" now works locally too.
echo.
echo Opening preview ...
start "" "..\phys.html"
goto end

:fail
echo.
echo [FAIL] Build error. Check messages above.
pause
goto end

:end
