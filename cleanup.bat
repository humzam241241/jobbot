@echo off
echo Cleaning up repository structure...

REM Make sure we're in the right directory
cd /d C:\Users\humza\resume_bot

REM Remove git cache reference to nested repo
git rm -rf resume-bot --cached 2>nul

REM Try to remove the nested directory
rmdir /s /q resume-bot 2>nul

REM If removal failed, rename it instead
if exist resume-bot (
    echo Moving problematic directory...
    move resume-bot resume-bot-backup
)

REM Clean up and commit
git add .
git commit -m "fix: clean up nested repository structure"
git push

echo Repository cleaned up successfully!
pause
