@echo off
echo ============================================
echo PUSH YOUR ERROR HANDLING CODE TO YOUR FORK
echo ============================================
echo.

set /p USERNAME="Enter your GitHub username: "

echo.
echo Adding your fork as remote...
git remote remove myfork 2>nul
git remote add myfork https://github.com/%USERNAME%/Stellar-forge.git

echo.
echo Checking current branch...
git branch --show-current

echo.
echo Pushing to your fork...
git push -u myfork feature/error-handling-clean

echo.
echo ============================================
echo SUCCESS! Now create PR on GitHub:
echo ============================================
echo.
echo 1. Go to: https://github.com/%USERNAME%/Stellar-forge
echo 2. Click "Compare & pull request" button
echo 3. Title: feat: Add comprehensive error handling system
echo 4. Click "Create pull request"
echo.
pause
