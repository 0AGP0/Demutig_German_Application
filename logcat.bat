@echo off
echo ========================================
echo   LOGCAT GORUNTULEME
echo ========================================
echo.

REM ADB yolu
set ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe

if not exist "%ADB_PATH%" (
    echo ADB bulunamadi: %ADB_PATH%
    echo.
    echo Lutfen Android SDK Platform Tools yuklu oldugundan emin olun.
    pause
    exit /b 1
)

echo ADB: %ADB_PATH%
echo.

echo Bagli cihazlar:
"%ADB_PATH%" devices
echo.

REM Cihaz sayısını kontrol et
"%ADB_PATH%" devices > temp_devices.txt 2>&1
findstr /C:"device" temp_devices.txt > temp_connected.txt 2>nul

set device_count=0
for /f %%i in ('find /c /v "" temp_connected.txt 2^>nul') do set device_count=%%i

if %device_count% EQU 0 (
    echo HIC CIHAZ BAGLI DEGIL!
    echo.
    echo USB debugging acik mi kontrol edin.
    echo Telefonunuzu USB ile baglayin.
    del temp_devices.txt temp_connected.txt 2>nul
    pause
    exit /b 1
)

if %device_count% GTR 1 (
    echo.
    echo Birden fazla cihaz bagli!
    echo.
    echo Fiziksel telefonu secmeye calisiyorum...
    echo.
    
    REM Fiziksel cihazı bul (emulator olmayan)
    set selected_device=
    for /f "tokens=1" %%d in (temp_connected.txt) do (
        "%ADB_PATH%" -s %%d shell getprop ro.kernel.qemu > temp_is_emu.txt 2>nul
        findstr /C:"1" temp_is_emu.txt >nul 2>&1
        if errorlevel 1 (
            set selected_device=%%d
            goto device_found
        )
    )
    
    device_found:
    if not defined selected_device (
        REM Emulator bulunamadı, ilk cihazı kullan
        for /f "tokens=1" %%d in (temp_connected.txt) do set selected_device=%%d
    )
    
    echo Secilen cihaz: %selected_device%
    set DEVICE_ID=-s %selected_device%
) else (
    REM Tek cihaz var
    for /f "tokens=1" %%d in (temp_connected.txt) do set DEVICE_ID=-s %%d
)

del temp_devices.txt temp_connected.txt temp_is_emu.txt 2>nul

echo.
echo Logcat temizleniyor...
"%ADB_PATH%" %DEVICE_ID% logcat -c
echo.

echo ========================================
echo Logcat basladi!
echo Ses butonuna basin ve loglari izleyin.
echo Cikmak icin Ctrl+C basin.
echo ========================================
echo.

"%ADB_PATH%" %DEVICE_ID% logcat *:S ReactNativeJS:V AudioService:V | findstr /i "AudioService audio sound Error playAudio res/raw"

pause
