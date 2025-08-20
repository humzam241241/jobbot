@echo off
echo Fixing repository structure...

REM Initialize git repository
git init

REM Add remote (replace with your actual repository URL)
REM git remote add origin https://github.com/yourusername/resume-bot.git

REM Add all files
git add .

REM Create initial commit
git commit -m "feat: complete resume bot application with AI providers, PDF generation, and robust error handling"

echo Repository fixed! You can now push to GitHub with:
echo git remote add origin YOUR_REPO_URL
echo git push -u origin main

pause
