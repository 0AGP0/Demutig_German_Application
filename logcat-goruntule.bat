@echo off
echo ========================================
echo   LOGCAT GORUNTULEME
echo ========================================
echo.

REM ADB kontrol
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: ADB bulunamadi!
    echo Android SDK Platform Tools yuklu olmali.
    pause
    exit /b 1
)

REM Cihazları kontrol et
echo Cihazlar kontrol ediliyor...
adb devices > temp_devices.txt 2>&1
findstr /C:"device" temp_devices.txt > temp_connected.txt 2>nul

REM Cihaz sayısı
set device_count=0
for /f %%i in ('find /c /v "" temp_connected.txt 2^>nul') do set device_count=%%i

if %device_count% EQU 0 (
    echo.
    echo HIC CIHAZ BAGLI DEGIL!
    echo.
    echo USB debugging acik mi kontrol edin.
    echo Telefonunuzu USB ile baglayin.
    echo.
    type temp_devices.txt
    del temp_devices.txt temp_connected.txt 2>nul
    pause
    exit /b 1
)

echo.
echo %device_count% cihaz bagli.
echo.

if %device_count% GTR 1 (
    echo Birden fazla cihaz var. Ilk cihaz kullaniliyor...
    echo.
    for /f "tokens=1" %%d in (temp_connected.txt) do (
        set device_id=%%d
        goto :single_device
    )
) else (
    for /f "tokens=1" %%d in (temp_connected.txt) do set device_id=%%d
)

:single_device
echo Cihaz: %device_id%
echo.
echo Logcat temizleniyor...
adb -s %device_id% logcat -c 2>nul
echo.
echo ========================================
echo Logcat basladi!
echo Ses butonuna basin ve loglari izleyin.
echo Cikmak icin Ctrl+C basin.
echo ========================================
echo.

adb -s %device_id% logcat | findstr /i "AudioService audio sound Error react-native"

del temp_devices.txt temp_connected.txt 2>nul
