# 🎯 Anki Deck Kurulum Rehberi (Hızlı Başlangıç)

## 📥 Adım 1: Anki Deck'lerini İndir ve Export Et

### 1.1 Anki'yi Yükle
- https://apps.ankiweb.net/ adresinden Anki'yi indir ve kur

### 1.2 Deck'leri İndir
1. https://ankiweb.net/shared/decks/german sayfasına git
2. Şu deck'leri ara ve indir (`.apkg` dosyaları):
   - ✅ A1 Vocabulary
   - ✅ A1 Sentences  
   - ✅ A1 Grammar
   - ✅ A2 Vocabulary
   - ✅ A2 Sentences
   - ✅ A2 Grammar
   - ✅ B1 Vocabulary
   - ✅ B1 Sentences
   - ✅ B1 Reading
   - ✅ B1 Listening
   - ✅ B2 Vocabulary
   - ✅ B2 Sentences
   - ✅ B2 Reading
   - ✅ B2 Listening

### 1.3 Deck'leri Anki'ye Yükle
- Anki'yi aç
- File → Import
- Her `.apkg` dosyasını tek tek import et

### 1.4 CSV'ye Export Et
Her deck için:

1. **Deck'i seç** (sol panelden)
2. **File → Export**
3. **Format:** "Notes in Plain Text (.txt)" veya "Notes in CSV (.csv)" seç
4. **"Include HTML and media references"** işaretini **KALDIR**
5. **Export** butonuna tıkla
6. **Dosyayı kaydet** (dosya adını aşağıdaki gibi değiştir)

### 1.5 Dosya Adlandırma
Export ettiğin dosyaları şu isimlerle kaydet:

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

## 📁 Adım 2: Dosyaları Kopyala

1. **Klasör oluştur:**
   ```
   D:\GermanApp\scripts\anki_data\
   ```

2. **CSV dosyalarını kopyala:**
   - Export ettiğin tüm CSV dosyalarını bu klasöre kopyala

## 🔄 Adım 3: JSON'a Dönüştür

Terminal'de:

```bash
cd D:\GermanApp
node scripts/process_anki_decks.js
```

Bu script:
- ✅ Tüm CSV dosyalarını okur
- ✅ JSON formatına dönüştürür
- ✅ `assets/data/` klasörüne kaydeder
- ✅ HTML etiketlerini temizler

## ✅ Adım 4: Kontrol Et

```bash
node scripts/validate_anki_data.js
```

Bu script:
- ✅ Tüm dosyaların varlığını kontrol eder
- ✅ Hedef sayılara ulaşıp ulaşmadığını gösterir
- ✅ Eksikleri listeler

## 📊 Hedefler

| Seviye | Kelime | Cümle | Gramer | Okuma | Dinleme |
|--------|--------|-------|--------|-------|---------|
| A1     | 500    | 300   | 50     | -     | -       |
| A2     | 1000   | 600   | 100    | -     | -       |
| B1     | 1500   | 1000  | -      | 20    | 20      |
| B2     | 2000+  | 1500+ | -      | 40    | 40      |

## 🎉 Hazır!

Artık uygulamanız Anki deck'leriyle çalışıyor:
- ✅ Tüm seviyeler (A1-B2)
- ✅ Kelimeler, cümleler, gramer
- ✅ Okuma ve dinleme (B1-B2)
- ✅ Otomatik ilerleme takibi

## ⚠️ Sorun Giderme

### "Dosya bulunamadı" hatası:
- CSV dosyalarının `scripts/anki_data/` klasöründe olduğundan emin ol
- Dosya adlarının doğru olduğunu kontrol et

### "JSON formatı hatalı":
- Anki export formatını kontrol et
- CSV'de virgül veya tırnak işareti hatası olabilir

### "Hedef sayıya ulaşılmadı":
- Deck'lerde yeterli içerik olmayabilir
- Uygulama çalışır, sadece hedef sayılar düşük olur







