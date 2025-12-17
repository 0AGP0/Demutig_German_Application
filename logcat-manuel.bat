@echo off
echo ========================================
echo   LOGCAT - MANUEL ADB YOLU
echo ========================================
echo.

REM ADB yolunu buraya yazin (ornek: C:\Users\Kullanici\AppData\Local\Android\Sdk\platform-tools\adb.exe)
REM Veya Android Studio yuklu ise genelde su yolda olur:
REM %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe

REM Otomatik bulma denemesi
set ADB_PATH=
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
    goto :found
)

if exist "%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe
    goto :found
)

if exist "C:\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=C:\Android\Sdk\platform-tools\adb.exe
    goto :found
)

echo ADB bulunamadi!
echo.
echo Lutfen ADB yolunu manuel olarak ayarlayin:
echo 1. Android Studio'yu acin
echo 2. File -^> Settings -^> Appearance ^& Behavior -^> System Settings -^> Android SDK
echo 3. "Android SDK Location" yolunu kopyalayin
echo 4. Bu dosyayi duzenleyip ADB_PATH degiskenine ekleyin
echo.
echo Ornek: set ADB_PATH=C:\Users\Kullanici\AppData\Local\Android\Sdk\platform-tools\adb.exe
pause
exit /b 1

:found
echo ADB bulundu: %ADB_PATH%
echo.

echo Bagli cihazlar:
"%ADB_PATH%" devices
echo.

echo Logcat basladi...
echo Ses butonuna basin ve loglari izleyin.
echo Cikmak icin Ctrl+C basin.
echo.
echo ========================================
echo.

"%ADB_PATH%" logcat -c
"%ADB_PATH%" logcat | findstr /i "AudioService audio sound Error"
