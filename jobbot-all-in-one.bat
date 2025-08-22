@echo off
echo JobBot All-in-One Setup and Start
echo ================================

:MENU
cls
echo.
echo  JobBot Menu
echo  ==========
echo.
echo  1. Quick Setup and Start
echo  2. Fix Database Connection
echo  3. Clean Repository
echo  4. Update Dependencies
echo  5. Start JobBot
echo  6. Exit
echo.
set /p CHOICE="Enter your choice (1-6): "

if "%CHOICE%"=="1" goto SETUP
if "%CHOICE%"=="2" goto FIX_DB
if "%CHOICE%"=="3" goto CLEAN
if "%CHOICE%"=="4" goto UPDATE
if "%CHOICE%"=="5" goto START
if "%CHOICE%"=="6" goto END
goto MENU

:SETUP
cls
echo Running JobBot Setup...
call jobbot-setup.bat
goto MENU

:FIX_DB
cls
echo Fixing Database Connection...
call fix-database.bat
goto MENU

:CLEAN
cls
echo Cleaning Repository...
call cleanup-repo.bat
goto MENU

:UPDATE
cls
echo Updating Dependencies...
call update-deps.bat
goto MENU

:START
cls
echo Starting JobBot...
call start-jobbot.bat
goto MENU

:END
echo Exiting JobBot Menu...
exit /b 0
