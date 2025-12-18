@echo off
setlocal

REM Apply the jsdom patch using patch-package.
REM Run from the repository root.

set ROOT_DIR=%~dp0
set HEADLESS_DIR=%ROOT_DIR%headless
set PATCH_DIR=%HEADLESS_DIR%\patches
set PATCH_FILE=%PATCH_DIR%\jsdom+13.2.0.patch

if not exist "%PATCH_FILE%" (
  echo Patch file not found: %PATCH_FILE%
  exit /b 1
)

echo Applying jsdom patch via patch-package...
pushd "%HEADLESS_DIR%"
npx patch-package jsdom
set RESULT=%ERRORLEVEL%
popd

if %RESULT% neq 0 (
  echo patch-package failed with exit code %RESULT%
  exit /b %RESULT%
)

echo Done.
endlocal
