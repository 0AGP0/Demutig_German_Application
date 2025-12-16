# 📱 demütig Uygulamasını Telefona İndirme Rehberi

## Seçenek 1: Expo Go ile Hızlı Test (Önerilen - Geliştirme için)

### Android için:

1. **Telefonunuza Expo Go uygulamasını indirin:**
   - Google Play Store'dan "Expo Go" uygulamasını indirin

2. **Bilgisayarınızda uygulamayı başlatın:**
   ```bash
   npm start
   ```
   
3. **QR kodunu tarayın:**
   - Terminal'de bir QR kod görünecek
   - Expo Go uygulamasını açın
   - "Scan QR code" seçeneğini seçin
   - QR kodu tarayın
   - Uygulama telefonunuzda yüklenecek

**Not:** Bu yöntemle uygulama internet bağlantısı gerektirir ve Expo Go uygulaması üzerinden çalışır.

---

## Seçenek 2: Standalone APK Oluşturma (Production - Gerçek Uygulama)

### EAS Build Kullanarak (Önerilen):

1. **EAS CLI'yi yükleyin:**
   ```bash
   npm install -g eas-cli
   ```

2. **EAS hesabı oluşturun:**
   ```bash
   eas login
   ```
   (Expo hesabınız yoksa ücretsiz oluşturabilirsiniz)

3. **Projeyi yapılandırın:**
   ```bash
   eas build:configure
   ```

4. **Android APK oluşturun:**
   ```bash
   eas build --platform android --profile preview
   ```
   
   Veya Play Store için:
   ```bash
   eas build --platform android --profile production
   ```

5. **Build tamamlandığında:**
   - EAS build sayfasında indirme linkini göreceksiniz
   - APK dosyasını indirip telefonunuza yükleyebilirsiniz

**Not:** İlk build yaklaşık 10-15 dakika sürebilir. Sonraki build'ler daha hızlı olur.

---

## Seçenek 3: Local Build (Gelişmiş)

### Android için:

1. **Android Studio'yu yükleyin** (SDK gerekli)

2. **Development Build oluşturun:**
   ```bash
   npx expo run:android
   ```
   
   Bu komut:
   - APK dosyasını oluşturur
   - Android emülatörde veya bağlı telefonda çalıştırır
   - APK dosyası `android/app/build/outputs/apk/` klasöründe oluşur

3. **APK'yı telefona aktarın:**
   - APK dosyasını USB ile telefona kopyalayın
   - Telefonda "Bilinmeyen kaynaklardan yükleme"yi etkinleştirin
   - APK dosyasına tıklayarak yükleyin

---

## Seçenek 4: Expo Development Build (Hybrid)

1. **Expo Development Build oluşturun:**
   ```bash
   eas build --profile development --platform android
   ```

2. **Build tamamlandığında indirin ve yükleyin**

Bu yöntem hem native özellikleri hem de Expo'nun kolaylıklarını sunar.

---

## 📋 Hızlı Başlangıç Önerisi

**En kolay yöntem: Expo Go** (Geliştirme için)
```bash
npm start
# QR kodu tarayın
```

**Production için: EAS Build** (Gerçek uygulama)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

---

## ⚠️ Önemli Notlar

1. **İlk kez build alıyorsanız:**
   - EAS Build kullanmanız önerilir (en kolay)
   - Ücretsiz Expo hesabı yeterli

2. **APK boyutu:**
   - Ses dosyaları çok yer kaplayabilir
   - İlk build'de tüm assets dahil olur

3. **Play Store'a yüklemek için:**
   - `eas build --platform android --profile production` kullanın
   - AAB formatı oluşturulur (Play Store için)

4. **Package name:**
   - Şu an: `com.germanlearning.app`
   - Değiştirmek isterseniz `app.json` dosyasını düzenleyin

---

## 🚀 Hızlı Test İçin

```bash
# 1. Terminal'de çalıştır
npm start

# 2. Telefonda Expo Go uygulamasını aç
# 3. QR kodu tara
# 4. Uygulama yüklensin!
```

---

Sorularınız için: https://docs.expo.dev/build/introduction/
