# Almanca Öğrenme Uygulaması

Offline çalışan, kişisel Almanca öğrenme asistanı uygulaması.

## 🚀 Hızlı Başlangıç

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

## 📚 Veri Kaynakları

Bu uygulama 4 ana veri kaynağı kullanır:

1. **German-Resources** - Dersler, diyaloglar, okuma metinleri
2. **German Vocabulary** - A1-B2 kelime listeleri (Türkçe anlamlı)
3. **Tatoeba** - Almanca cümle örnekleri
4. **FrequencyWords** - Kelime sıklık listesi (önceliklendirme)

### Veri Entegrasyonu

Veri kaynaklarını entegre etmek için `docs/DATA_INTEGRATION.md` dosyasına bakın.

**Hızlı Başlangıç:**
1. `scripts/` klasöründeki scriptleri kullanarak verileri işleyin
2. İşlenmiş verileri `assets/data/` klasörüne kopyalayın
3. `node scripts/validate_data.js` ile doğrulayın

## ✨ Özellikler

- 📚 **Dersler**: A1-A2 seviyesinde yapılandırılmış dersler
- 📖 **Kelimeler**: SRS (Spaced Repetition) ile kelime öğrenme
- 💬 **Cümle Çalışması**: Günlük cümle pratiği
- 📄 **Okuma**: Kısa metinler ve comprehension soruları
- 📝 **Gramer**: Gramer konuları ve örnekler
- 📊 **İlerleme Takibi**: Streak, istatistikler ve seviye ilerlemesi
- 🎯 **Kelime Önceliklendirme**: FrequencyWords ile en önemli kelimeler

## 📁 Proje Yapısı

```
src/
├── models/          # Veri modelleri
├── screens/         # Ekranlar
├── services/        # Veri servisleri
└── utils/           # Yardımcı fonksiyonlar

assets/
└── data/            # Veri dosyaları (JSON)

scripts/              # Veri işleme scriptleri
docs/                 # Dokümantasyon
```

## 🔧 Geliştirme

- React Native + TypeScript
- Expo
- React Navigation
- AsyncStorage (local storage)

## 📝 Notlar

- Uygulama tamamen offline çalışır
- Veriler `assets/data/` klasöründeki JSON dosyalarından yüklenir
- İlerleme AsyncStorage'da saklanır
