# QR Kod Sorunu Çözümleri

## Sorun: QR kod taranıyor ama uygulama açılmıyor (Emülatörde çalışıyor)

Bu sorun genellikle network bağlantısı veya Expo Go ile ilgilidir.

---

## ✅ Çözüm 1: Tunnel Modu Kullan (En Etkili)

Bilgisayarınızda terminal'de:

```bash
npm start -- --tunnel
```

veya

```bash
npx expo start --tunnel
```

**Tunnel modu:**
- Bilgisayar ve telefon farklı ağlarda olsa bile çalışır
- Daha yavaş olabilir ama güvenilirdir
- QR kod yeni bir URL içerecek (exp.host üzerinden)

---

## ✅ Çözüm 2: LAN Modu + Aynı WiFi

1. **Bilgisayar ve telefonun aynı WiFi ağında olduğundan emin olun**

2. **Terminal'de LAN modunu kontrol edin:**
   ```bash
   npm start
   ```

3. **Terminal'de şu satırları göreceksiniz:**
   ```
   › Metro waiting on exp://192.168.x.x:8081
   › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
   ```

4. **QR kodu tarayın veya manuel olarak:**
   - Expo Go'da "Enter URL manually" seçeneğini kullanın
   - Terminal'deki `exp://192.168.x.x:8081` adresini girin

---

## ✅ Çözüm 3: Firewall Kontrolü

### Windows için:

1. **Windows Defender Firewall'u kontrol edin:**
   - Windows Security → Firewall & network protection
   - Metro bundler için izin verin (port 8081)

2. **Veya geçici olarak firewall'u kapatın (test için):**
   - Sadece test amaçlı, sonra tekrar açın

### Manuel Port İzni:

1. Windows Security → Firewall & network protection → Advanced settings
2. Inbound Rules → New Rule
3. Port → TCP → 8081
4. Allow the connection
5. Finish

---

## ✅ Çözüm 4: Manuel URL Girişi

1. **Terminal'deki URL'yi kopyalayın:**
   ```
   exp://192.168.x.x:8081
   ```

2. **Expo Go uygulamasında:**
   - "Enter URL manually" seçeneğini seçin
   - URL'yi yapıştırın
   - "Connect" butonuna basın

---

## ✅ Çözüm 5: Expo Go'yu Güncelleyin

1. **Play Store'dan Expo Go'yu güncelleyin**
2. **Uygulamayı kapatıp tekrar açın**
3. **QR kodu tekrar tarayın**

---

## ✅ Çözüm 6: USB Debugging (Alternatif)

Eğer yukarıdakiler çalışmazsa:

1. **Telefonu USB ile bilgisayara bağlayın**
2. **USB Debugging'i açın** (Geliştirici seçenekleri)
3. **Terminal'de:**
   ```bash
   npm start
   ```
4. **Başka bir terminal'de:**
   ```bash
   npx expo start --android
   ```
   
   Bu komut uygulamayı direkt telefona yükler.

---

## 🔍 Debug İpuçları

### Terminal Çıktısını Kontrol Edin:

QR kod tarandığında terminal'de şunu görmelisiniz:
```
› Metro waiting on exp://192.168.x.x:8081
```

### Ping Test:

1. **Terminal'de IP adresinizi bulun:**
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

2. **Telefondan bilgisayarın IP'sine ping atın:**
   - Aynı WiFi ağında olmalı

### Expo Go Logları:

Expo Go uygulamasında hata mesajı varsa kontrol edin:
- "Unable to connect" → Network sorunu
- "Module not found" → Farklı bir sorun

---

## 🚀 Önerilen Adımlar (Sırayla)

1. ✅ **Tunnel modunu dene:**
   ```bash
   npm start -- --tunnel
   ```

2. ✅ **Aynı WiFi kontrolü yap**

3. ✅ **Manuel URL girişi dene**

4. ✅ **Firewall izinlerini kontrol et**

5. ✅ **Expo Go'yu güncelle**

---

## 📱 Hızlı Test

```bash
# Terminal 1: Tunnel modu
npm start -- --tunnel

# Terminal 2 (alternatif): LAN modu
npm start
# Sonra manuel URL girişi yap
```

---

**Not:** Tunnel modu en güvenilir çözümdür ama biraz daha yavaş olabilir. LAN modu daha hızlıdır ama aynı WiFi ağında olmanız gerekir.
