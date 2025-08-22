@echo off
echo JobBot Repository Cleanup
echo =======================

REM Clean up node_modules cache
echo Cleaning node_modules cache...
call pnpm -w run clean

REM Remove any temporary files
echo Removing temporary files...
del /s /q *.tmp
del /s /q *.log
del /s /q *.bak

REM Remove unused report files
echo Removing unused report files...
if exist deadcode-report.txt del deadcode-report.txt
if exist depcheck-report.txt del depcheck-report.txt
if exist knip-report.txt del knip-report.txt

REM Remove redundant documentation
echo Removing redundant documentation...
if exist FIXES_SUMMARY.md del FIXES_SUMMARY.md
if exist SETUP_GUIDE.md del SETUP_GUIDE.md
if exist implementation-summary.md del implementation-summary.md

REM Remove redundant batch files
echo Removing redundant batch files...
if exist setup-and-run.bat del setup-and-run.bat
if exist setup-database.bat del setup-database.bat
if exist cleanup.bat del cleanup.bat
if exist quick-setup.bat del quick-setup.bat

echo Repository cleanup complete!
echo.
echo Run jobbot-setup.bat to set up the application.
echo Run fix-database.bat if you encounter database connection issues.

pause
