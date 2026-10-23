@echo off
setlocal enabledelayedexpansion
echo [ClauseLens] Building application...

set "TOMCAT=D:\tomcat10\apache-tomcat-10.1.61"
set "WEBAPP=%TOMCAT%\webapps\clauselens"
set "CLASSES=d:\clauselens\target\classes"

if not exist "%CLASSES%" mkdir "%CLASSES%"
if not exist "%WEBAPP%\WEB-INF\classes" mkdir "%WEBAPP%\WEB-INF\classes"

echo [ClauseLens] Compiling Java source files...
set "CP=%TOMCAT%\lib\servlet-api.jar;%WEBAPP%\WEB-INF\lib\*"

powershell -Command "$files = (Get-ChildItem -Path 'd:\clauselens\src\main\java' -Filter '*.java' -Recurse | ForEach-Object { $_.FullName }); & javac -cp '%CP%' -d '%CLASSES%' -encoding UTF-8 $files"
if %ERRORLEVEL% neq 0 (
    echo [ClauseLens ERROR] Compilation failed.
    exit /b %ERRORLEVEL%
)

echo [ClauseLens] Copying compiled classes to Tomcat...
xcopy /E /Y /I "%CLASSES%\*" "%WEBAPP%\WEB-INF\classes\" >nul

echo [ClauseLens] Syncing webapp assets (HTML, CSS, JS)...
xcopy /E /Y /I "d:\clauselens\src\main\webapp\*" "%WEBAPP%\" >nul

if exist "%WEBAPP%\WEB-INF\web.xml" (
    powershell -Command "(Get-Item '%WEBAPP%\WEB-INF\web.xml').LastWriteTime = Get-Date"
)

echo [ClauseLens] Build and sync complete!
