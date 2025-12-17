@echo off
echo ========================================
echo   REACT NATIVE CLI - APK BUILD
echo ========================================
echo.

REM Java 17'yi ayarla
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Java versiyonu:
java -version
echo.

cd android

echo APK olusturuluyor...
echo Bu islem 10-15 dakika surebilir...
echo.

call gradlew.bat assembleRelease --no-daemon

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   BUILD BASARILI!
    echo ========================================
    echo.
    echo APK konumu:
    echo android\app\build\outputs\apk\release\app-release.apk
    echo.
    
    if exist "app\build\outputs\apk\release\app-release.apk" (
        explorer "app\build\outputs\apk\release"
    )
) else (
    echo.
    echo ========================================
    echo   BUILD BASARISIZ!
    echo ========================================
    echo.
)

cd ..
pause


