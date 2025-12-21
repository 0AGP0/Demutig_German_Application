# PDF Renderer Sorununu Çözme Adımları

## Sorun
Native modül (react-native-pdf-renderer) bulunamıyor çünkü uygulama yeniden build edilmemiş.

## Çözüm Adımları

### 1. Metro Bundler'ı Durdurun
Ctrl+C ile Metro bundler'ı durdurun.

### 2. Uygulamayı Cihazdan/Emulatörden Kaldırın
```powershell
adb uninstall com.germanlearning.app
```

### 3. Android Projesini Temizleyin
```powershell
cd android
.\gradlew.bat clean
cd ..
```

### 4. Cache'leri Temizleyin
```powershell
# Metro cache
npx react-native start --reset-cache

# Yeni bir terminal açın ve:
cd android
.\gradlew.bat cleanBuildCache
cd ..
```

### 5. Yeniden Build Edin ve Çalıştırın
```powershell
npx react-native run-android
```

Bu işlem 3-5 dakika sürebilir. İlk build'de native kodlar derlenir.

## Eğer Hala Çalışmazsa

1. **Android Studio'dan Build:**
   - Android Studio'yu açın
   - `android` klasörünü açın
   - Build > Clean Project
   - Build > Rebuild Project
   - Run butonuna basın

2. **Node Modules'i Yeniden Yükleyin:**
```powershell
rm -rf node_modules
npm install
cd android
.\gradlew.bat clean
cd ..
npx react-native run-android
```

## Kontrol Listesi
- ✅ settings.gradle'da modül eklendi
- ✅ build.gradle'da dependency eklendi  
- ✅ MainApplication.kt'de PdfRendererPackage import edildi ve eklendi
- ❌ Uygulama YENİDEN BUILD EDİLMEDİ (Bu adımı yapmanız gerekiyor!)

