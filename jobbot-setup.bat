@echo off
echo JobBot Setup and Cleanup
echo =======================

REM Create .env.local if it doesn't exist
if not exist apps\web\.env.local (
  echo Creating .env.local file...
  
  REM Create a temporary file first
  echo # JobBot Environment Variables > apps\web\.env.local.tmp
  echo. >> apps\web\.env.local.tmp
  echo # Database >> apps\web\.env.local.tmp
  echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot >> apps\web\.env.local.tmp
  echo. >> apps\web\.env.local.tmp
  echo # Authentication >> apps\web\.env.local.tmp
  echo NEXTAUTH_URL=http://localhost:3000 >> apps\web\.env.local.tmp
  echo NEXTAUTH_SECRET=jobbot-secret-key >> apps\web\.env.local.tmp
  echo. >> apps\web\.env.local.tmp
  echo # AI Providers >> apps\web\.env.local.tmp
  
  REM Prompt for API keys
  set /p OPENAI_KEY="Enter your OpenAI API key (or press Enter to skip): "
  if not "%OPENAI_KEY%"=="" (
    echo OPENAI_API_KEY=%OPENAI_KEY% >> apps\web\.env.local.tmp
  )
  
  set /p ANTHROPIC_KEY="Enter your Anthropic API key (or press Enter to skip): "
  if not "%ANTHROPIC_KEY%"=="" (
    echo ANTHROPIC_API_KEY=%ANTHROPIC_KEY% >> apps\web\.env.local.tmp
  )
  
  set /p GOOGLE_KEY="Enter your Google API key (or press Enter to skip): "
  if not "%GOOGLE_KEY%"=="" (
    echo GOOGLE_API_KEY=%GOOGLE_KEY% >> apps\web\.env.local.tmp
  )
  
  REM Move the temporary file to the final location
  move /y apps\web\.env.local.tmp apps\web\.env.local
  echo .env.local file created successfully.
)

REM Fix Prisma schema
echo Fixing Prisma schema...
set PRISMA_SCHEMA=apps\web\prisma\schema.prisma
powershell -Command "(Get-Content '%PRISMA_SCHEMA%') -replace 'provider = \"postgresql\"', 'provider = \"postgres\"' | Set-Content '%PRISMA_SCHEMA%'"

REM Install dependencies
echo Installing dependencies...
call pnpm install

REM Install Google Generative AI SDK
echo Installing Google Generative AI SDK...
call pnpm add -w @google/generative-ai

REM Clean up redundant files
echo Cleaning up redundant files...
if exist setup-and-run.bat del setup-and-run.bat
if exist setup-database.bat del setup-database.bat
if exist cleanup.bat del cleanup.bat
if exist quick-setup.bat del quick-setup.bat

REM Create .env file with correct DATABASE_URL (for Prisma)
echo Creating .env file with correct database URL...
echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot > apps\web\.env

REM Check if PostgreSQL is running
echo Checking PostgreSQL connection...
powershell -Command "try { $conn = New-Object System.Data.Odbc.OdbcConnection; $conn.ConnectionString = 'Driver={PostgreSQL ODBC Driver(UNICODE)};Server=localhost;Port=5432;Database=postgres;Uid=postgres;Pwd=postgres;'; $conn.Open(); Write-Host 'PostgreSQL is running.'; $conn.Close(); } catch { Write-Host 'WARNING: Could not connect to PostgreSQL. Make sure it is installed and running.'; }"

REM Run Prisma migrations
echo Running database migrations...
cd apps\web
call npx prisma generate
call npx prisma migrate dev --name add_usage_tracking
cd ..\..

echo Setup complete! 
echo.
echo If you encounter database errors, run fix-database.bat to repair the connection.
echo.
echo Starting development server...
call pnpm dev
