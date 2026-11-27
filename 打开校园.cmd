@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto usepython
py -3 serve.py
goto :eof
:usepython
python serve.py

