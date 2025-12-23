@echo off
echo ========================================
echo LOGCAT HATALARI KONTROL EDILIYOR...
echo ========================================
echo.
echo Uygulamayi acip kapattiktan sonra buraya bakin...
echo.
adb logcat *:E ReactNative:V ReactNativeJS:V | findstr /i "error exception crash fatal"
pause







