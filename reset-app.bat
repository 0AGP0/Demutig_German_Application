@echo off
echo Emülatör kontrol ediliyor...
adb devices

echo.
echo Uygulama kaldırılıyor...
adb uninstall com.germanlearning.app

echo.
echo Uygulama yeniden yükleniyor...
npm run android

echo.
echo Tamamlandı! Uygulama sıfırlandı ve yeniden yüklendi.








