# Test Talimatları

## Android Emülatör veya Telefon Üzerinde Test

### Önkoşullar
1. **Android Studio** yüklü olmalı
2. **Java JDK** yüklü olmalı (JDK 11 veya üzeri)
3. **Android SDK** yapılandırılmış olmalı
4. **Emülatör** veya **USB Debugging** aktif telefon

---

## Yöntem 1: Android Emülatör

### Adım 1: Emülatörü Başlat
1. Android Studio'yu aç
2. **Tools > Device Manager** (veya AVD Manager)
3. Bir emülatör seç ve **▶️ Play** butonuna bas
4. Emülatör açılana kadar bekle (birkaç dakika sürebilir)

### Adım 2: Metro Bundler'ı Başlat
Terminal 1'de:
```bash
npm start
```
veya
```bash
npx react-native start
```

### Adım 3: Uygulamayı Çalıştır
Terminal 2'de (yeni bir terminal):
```bash
npm run android
```
veya
```bash
npx react-native run-android
```

**Not:** İlk çalıştırmada build işlemi uzun sürebilir (5-10 dakika).

---

## Yöntem 2: Gerçek Android Telefon

### Adım 1: USB Debugging Aktif Et
1. Telefonda **Ayarlar > Telefon Hakkında**
2. **Yapı Numarası**'na 7 kez dokun (Geliştirici seçenekleri açılır)
3. **Ayarlar > Geliştirici Seçenekleri**
4. **USB Debugging**'i aç

### Adım 2: Telefonu Bağla
1. USB kablosu ile bilgisayara bağla
2. Telefonda "USB Debugging izin ver" uyarısını onayla

### Adım 3: Cihazı Kontrol Et
Terminalde:
```bash
adb devices
```
Telefonunuz listede görünmeli:
```
List of devices attached
XXXXXXXX    device
```

### Adım 4: Uygulamayı Çalıştır
```bash
npm run android
```

---

## Sorun Giderme

### Metro Bundler Başlamıyor
```bash
# Cache'i temizle
npm start -- --reset-cache
```

### Build Hatası
```bash
# Android klasörünü temizle
cd android
./gradlew clean
cd ..
npm run android
```

### Port 8081 Kullanımda
```bash
# Port'u öldür (Windows)
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Port'u öldür (Mac/Linux)
lsof -ti:8081 | xargs kill -9
```

### Emülatör Yavaş
- **HAXM** (Intel) veya **Hypervisor** (AMD) etkinleştir
- Emülatör ayarlarında RAM'i artır (4GB+)
- **Cold Boot** yerine **Quick Boot** kullan

### ADB Bulunamıyor
Android SDK path'ini ekle:
```bash
# Windows
set PATH=%PATH%;%LOCALAPPDATA%\Android\Sdk\platform-tools

# Mac/Linux
export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools
```

---

## Hızlı Test Komutları

### Sadece Metro Bundler
```bash
npm start
```

### Sadece Android Build
```bash
npm run android
```

### Her İkisi Birden (2 Terminal)
Terminal 1:
```bash
npm start
```

Terminal 2:
```bash
npm run android
```

### Release APK Oluştur
```bash
npm run build:android
```
APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## Hot Reload

Uygulama çalışırken:
- **R** tuşuna bas = Yeniden yükle
- **Ctrl+M** (Android) = Developer Menu
- **Ctrl+D** (Android) = Reload

---

## Logları Görüntüle

```bash
# React Native logları
npx react-native log-android

# Android logcat
adb logcat
```

---

## İlk Kurulum Kontrol Listesi

- [ ] Node.js yüklü (v16+)
- [ ] Java JDK yüklü (JDK 11+)
- [ ] Android Studio yüklü
- [ ] Android SDK yapılandırılmış
- [ ] ANDROID_HOME environment variable set
- [ ] Emülatör oluşturulmuş veya telefon hazır
- [ ] `npm install` çalıştırılmış
- [ ] Metro bundler başlatılmış
- [ ] Uygulama çalıştırılmış

---

## Notlar

- İlk build 5-10 dakika sürebilir
- Her kod değişikliğinde otomatik reload olur
- Emülatör kapalıysa `npm run android` otomatik açar
- Telefon kullanıyorsanız aynı WiFi ağında olmalı (USB debugging için gerekli değil)




