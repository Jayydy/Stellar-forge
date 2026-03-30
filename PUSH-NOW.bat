@echo off
echo ============================================
echo PUSHING YOUR CODE TO CREATE PR
echo ============================================
echo.

echo Step 1: Adding your fork as remote...
git remote remove myfork 2>nul
git remote add myfork https://github.com/zarmaijemimah/Stellar-forge.git

echo.
echo Step 2: Checking you're on the right branch...
git branch --show-current

echo.
echo Step 3: Pushing to your fork...
git push -u myfork feature/error-handling-clean

echo.
echo ============================================
echo SUCCESS! Now create your PR:
echo ============================================
echo.
echo 1. Go to: https://github.com/zarmaijemimah/Stellar-forge
echo 2. Click the green "Compare & pull request" button
echo 3. Title: feat: Add comprehensive error handling system
echo 4. Click "Create pull request"
echo.
echo Your PR will go from:
echo   zarmaijemimah:feature-error-handling-clean
echo   TO
echo   Ejirowebfi:main
echo.
pause
