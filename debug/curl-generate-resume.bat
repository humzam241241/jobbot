@echo off
echo Testing resume generation endpoint...
echo.

REM Create sample PDF if it doesn't exist
if not exist "debug\sample.pdf" (
    echo Creating sample PDF...
    echo "Sample Resume" > "debug\sample.pdf"
)

REM Test the endpoint
curl -X POST http://localhost:3000/api/resume/generate ^
  -H "Content-Type: multipart/form-data" ^
  -F "jobDescription=Senior Software Engineer position requiring expertise in TypeScript, React, and Node.js. Must have experience with cloud platforms and microservices architecture." ^
  -F "provider=google" ^
  -F "model=gemini-2.5-pro" ^
  -F "resume=@debug/sample.pdf;type=application/pdf" ^
  -F "masterResume={\"text\":\"Senior Software Engineer with 5+ years experience in TypeScript, React, and Node.js. Expertise in cloud platforms and microservices architecture.\"}" ^
  -F "applicantProfile={\"name\":\"John Doe\",\"email\":\"john@example.com\"}"

echo.
echo If you get a 500 error, check /api/debug/last-errors for details.
