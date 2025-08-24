@echo off
echo Running style preservation test...
cd %~dp0
npx ts-node -P ./apps/web/tsconfig.json ./apps/web/scripts/test-style-preservation.ts
echo Test completed.
pause
