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

Bu uygulama şu veri kaynaklarını kullanır:

1. **Langenscheidt Basic German Vocabulary** - Kelime listeleri (vocab_langenscheidt.json)
2. **German 7k Sentences** - Almanca cümle örnekleri (sentences_7k.json)

Veriler `assets/data/` klasöründeki JSON dosyalarından yüklenir.

## ✨ Özellikler

- 📖 **Kelimeler**: Spaced Repetition (SRS) ile kelime öğrenme ve tekrar sistemi
- 💬 **Cümle Çalışması**: Günlük cümle pratiği ve tekrar mekanizması
- 📊 **İlerleme Takibi**: Streak, istatistikler ve seviye ilerlemesi
- 🎯 **Akıllı Tekrar**: Öğrenilen kelimeler zamanı geldiğinde otomatik tekrar gösterilir
- 📱 **Offline Çalışma**: İnternet bağlantısı olmadan tam fonksiyonel

## 📁 Proje Yapısı

```
src/
├── models/          # Veri modelleri
├── screens/         # Ekranlar
├── services/        # Veri servisleri
└── utils/           # Yardımcı fonksiyonlar

assets/
└── data/            # Veri dosyaları (JSON)
    ├── vocab_langenscheidt.json
    └── german_sentences/
        └── sentences_7k.json
```

## 🔧 Geliştirme

- React Native CLI + TypeScript
- React Navigation
- AsyncStorage (local storage)
- react-native-sound (ses çalma)

## 📝 Notlar

- Uygulama tamamen offline çalışır
- Veriler `assets/data/` klasöründeki JSON dosyalarından yüklenir
- İlerleme AsyncStorage'da saklanır
