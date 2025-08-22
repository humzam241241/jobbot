@echo off
echo JobBot Database Fix
echo ==================

REM Create .env file with correct DATABASE_URL
echo Creating .env file with correct database URL...
echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot > apps\web\.env

REM Fix Prisma schema
echo Fixing Prisma schema...
powershell -Command "(Get-Content 'apps\web\prisma\schema.prisma') -replace 'provider = \"postgresql\"', 'provider = \"postgres\"' | Set-Content 'apps\web\prisma\schema.prisma'"

REM Run Prisma migrations
echo Running database migrations...
cd apps\web
call npx prisma generate
call npx prisma migrate dev --name add_usage_tracking

echo Database fix complete!
echo If you still encounter issues, make sure PostgreSQL is running and the database exists.
echo You can create the database manually with: psql -U postgres -c "CREATE DATABASE jobbot;"

pause
