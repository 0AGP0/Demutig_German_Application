@echo off
echo ========================================
echo   LOGCAT - BASIT VERSIYON
echo ========================================
echo.

REM ADB kontrol
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: ADB bulunamadi!
    pause
    exit /b 1
)

echo Bagli cihazlar:
adb devices
echo.

echo Logcat basladi...
echo Ses butonuna basin ve loglari izleyin.
echo Cikmak icin Ctrl+C basin.
echo.
echo ========================================
echo.

adb logcat -c
adb logcat | findstr /i "AudioService audio sound Error"
