# Uygulamayı Sıfırlama

## Adımlar:

1. **Emülatörü başlatın** (Android Studio > Device Manager > Play butonu)

2. **Terminalde şu komutları çalıştırın:**

```bash
# Uygulamayı kaldır
adb uninstall com.germanlearning.app

# Uygulamayı yeniden yükle
npm run android
```

Veya **reset-app.bat** dosyasını çalıştırın (Windows'ta çift tıklayın)

## Alternatif: Manuel Temizleme

Eğer emülatör çalışıyorsa:

```bash
# Tüm uygulama verilerini temizle
adb shell pm clear com.germanlearning.app

# Sonra uygulamayı yeniden başlat
npm run android
```

## Not:
- Development modunda her açılışta veriler otomatik temizleniyor
- Ama emülatörde eski veriler kalabilir, bu yüzden uygulamayı kaldırıp yeniden yüklemek en garantili yöntem



