# 📱 APK Oluşturma Rehberi - demütig

Expo Go olmadan direkt APK oluşturup telefonunuza yükleyebilirsiniz.

---

## 🚀 Hızlı Başlangıç (EAS Build ile)

### Adım 1: EAS CLI Yükle

```bash
npm install -g eas-cli
```

### Adım 2: Expo Hesabı Oluştur/Giriş Yap

```bash
eas login
```

Eğer hesabınız yoksa:
- Terminal'de `eas login` yazın
- "Create an account" seçeneğini seçin
- Ücretsiz hesap oluşturun (email + şifre)

### Adım 3: Projeyi Yapılandır

```bash
eas build:configure
```

Bu komut `eas.json` dosyasını oluşturur (zaten oluşturduk, güncelleme yapabilir).

### Adım 4: Android APK Oluştur

```bash
eas build --platform android --profile preview
```

**İlk build yaklaşık 10-15 dakika sürebilir.**

Build başladıktan sonra:
1. Terminal'de bir link göreceksiniz (örn: `https://expo.dev/...`)
2. Bu linke tarayıcıdan gidin
3. Build durumunu takip edin
4. Build tamamlandığında "Download" butonu görünecek
5. APK dosyasını indirin

### Adım 5: APK'yı Telefona Yükle

1. **APK dosyasını telefonunuza aktarın:**
   - USB ile kopyalayın
   - Veya e-mail ile gönderin
   - Veya Google Drive/Dropbox kullanın

2. **Telefonda "Bilinmeyen kaynaklardan yükleme"yi açın:**
   - Ayarlar → Güvenlik → Bilinmeyen kaynaklardan uygulama yükleme
   - (Android 8+ için: Yükleme sırasında izin verilir)

3. **APK dosyasına tıklayın ve yükleyin**

---

## 📋 Alternatif: Local Build (Gelişmiş)

Eğer EAS Build kullanmak istemiyorsanız:

### Gereksinimler:
- Android Studio (SDK gerekli)
- Java JDK

### Adımlar:

1. **Native proje oluştur:**
   ```bash
   npx expo prebuild
   ```

2. **APK oluştur:**
   ```bash
   npx expo run:android --variant release
   ```

   Veya Android Studio ile:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **APK dosyası bulunur:**
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## ⚙️ Yapılandırma Detayları

### app.json Ayarları:

```json
{
  "expo": {
    "name": "demütig",
    "slug": "demutig",
    "version": "1.0.0",
    "android": {
      "package": "com.germanlearning.app",
      "versionCode": 1
    }
  }
}
```

### Package Name Değiştirme:

Eğer package name değiştirmek isterseniz:

1. `app.json` dosyasında:
   ```json
   "android": {
     "package": "com.demutig.app"
   }
   ```

2. `eas.json` dosyasında (production için):
   ```json
   "production": {
     "android": {
       "buildType": "apk",
       "package": "com.demutig.app"
     }
   }
   ```

---

## 🔍 Sorun Giderme

### "eas: command not found"
```bash
npm install -g eas-cli
```

### "No Expo account found"
```bash
eas login
# Yeni hesap oluşturun
```

### Build başarısız oluyor
- `eas.json` dosyasını kontrol edin
- `app.json` dosyasını kontrol edin
- Logları inceleyin: `eas build:list`

### APK çok büyük
- Ses dosyaları çok yer kaplayabilir
- İlk build'de tüm assets dahil olur
- Production build daha optimize olur

---

## 📱 Build Türleri

### Preview (Test için - APK)
```bash
eas build --platform android --profile preview
```
- APK formatı
- Hızlı build
- Test için ideal

### Production (Play Store için)
```bash
eas build --platform android --profile production
```
- AAB formatı (Play Store için)
- Daha optimize
- Store'a yüklemek için

---

## 🎯 Hızlı Komutlar

```bash
# 1. EAS CLI yükle
npm install -g eas-cli

# 2. Giriş yap
eas login

# 3. APK oluştur
eas build --platform android --profile preview

# 4. Build durumunu kontrol et
eas build:list

# 5. APK indir (build tamamlandıktan sonra)
# Web sayfasından indirebilirsiniz
```

---

## 💡 İpuçları

1. **İlk build uzun sürer** (10-15 dakika), sonrakiler daha hızlı

2. **Build geçmişini görmek için:**
   ```bash
   eas build:list
   ```

3. **Build iptal etmek için:**
   - Web sayfasından iptal edebilirsiniz
   - Veya yeni bir build başlatın

4. **Ses dosyaları:**
   - Çok fazla ses dosyası varsa APK büyük olabilir
   - İlk build'de tüm dosyalar dahil olur

---

## ✅ Başarı Kontrolü

APK başarıyla oluşturulduğunda:
- Terminal'de "Build finished" mesajı görünecek
- Web sayfasında "Download" butonu olacak
- APK dosyası indirilebilir olacak

---

**Sorularınız için:** https://docs.expo.dev/build/introduction/
