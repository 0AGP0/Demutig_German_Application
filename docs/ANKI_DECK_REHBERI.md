# Anki Deck Kurulum Rehberi

## 📥 Adım 1: Anki Deck'lerini İndir

1. **Anki'yi yükle:**
   - https://apps.ankiweb.net/ adresinden Anki'yi indir ve kur

2. **Deck'leri indir:**
   - https://ankiweb.net/shared/decks/german sayfasına git
   - Şu deck'leri ara ve indir:
     - A1 Vocabulary
     - A1 Sentences
     - A1 Grammar
     - A2 Vocabulary
     - A2 Sentences
     - A2 Grammar
     - B1 Vocabulary
     - B1 Sentences
     - B1 Reading
     - B1 Listening
     - B2 Vocabulary
     - B2 Sentences
     - B2 Reading
     - B2 Listening

3. **Deck'leri Anki'ye yükle:**
   - Anki'yi aç
   - File → Import → İndirdiğin `.apkg` dosyasını seç
   - Her deck için tekrarla

## 📤 Adım 2: CSV'ye Çevir

Her deck için:

1. **Deck'i seç:**
   - Anki'de sol panelden deck'i seç

2. **Export yap:**
   - File → Export
   - Format: "Notes in Plain Text (.txt)" veya "Notes in CSV (.csv)" seç
   - "Include HTML and media references" işaretini kaldır
   - Export'a tıkla
   - Dosyayı kaydet

3. **Dosya adlandırma:**
   ```
   a1_vocab.csv
   a1_sentences.csv
   a1_grammar.csv
   a2_vocab.csv
   a2_sentences.csv
   a2_grammar.csv
   b1_vocab.csv
   b1_sentences.csv
   b1_reading.csv
   b1_listening.csv
   b2_vocab.csv
   b2_sentences.csv
   b2_reading.csv
   b2_listening.csv
   ```

4. **CSV dosyalarını kopyala:**
   ```
   D:\GermanApp\scripts\anki_data\
   ```
   (Bu klasörü oluşturmanız gerekebilir)

## 🔄 Adım 3: JSON'a Dönüştür

Script otomatik olarak CSV'leri JSON'a dönüştürür:

```bash
cd D:\GermanApp
node scripts/process_anki_decks.js
```

Bu script:
- Tüm CSV dosyalarını okur
- JSON formatına dönüştürür
- `assets/data/` klasörüne kaydeder

## ✅ Adım 4: Kontrol Et

```bash
node scripts/validate_anki_data.js
```

## 📁 Oluşan Dosya Yapısı

```
assets/data/
├── vocabulary/
│   ├── A1.json
│   ├── A2.json
│   ├── B1.json
│   └── B2.json
├── sentences/
│   ├── A1.json
│   ├── A2.json
│   ├── B1.json
│   └── B2.json
├── grammar/
│   ├── A1.json
│   ├── A2.json
│   ├── B1.json
│   └── B2.json
├── readings/
│   ├── B1.json
│   └── B2.json
└── listening/
    ├── B1.json
    └── B2.json
```

## 🎯 Hedefler

| Seviye | Kelime | Cümle | Gramer | Okuma | Dinleme |
|--------|--------|-------|--------|-------|---------|
| A1     | 500    | 300   | 50     | -     | -       |
| A2     | 1000   | 600   | 100    | -     | -       |
| B1     | 1500   | 1000  | -      | 20    | 20      |
| B2     | 2000+  | 1500+ | -      | 40    | 40      |

## ⚠️ Notlar

- Anki CSV formatı değişebilir, script buna göre güncellenebilir
- Bazı deck'ler farklı formatlarda olabilir
- HTML etiketleri temizlenir
- Media referansları (resim, ses) şimdilik desteklenmez







