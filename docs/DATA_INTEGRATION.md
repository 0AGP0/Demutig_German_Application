# Veri Entegrasyon Rehberi

Bu doküman, 4 ana veri kaynağını uygulamaya nasıl entegre edeceğinizi açıklar.

## 📋 Veri Kaynakları

### 1. German-Resources
**Kaynak:** https://github.com/eymenefealtun/German-Resources
**Kullanım:** Dersler, diyaloglar, okuma metinleri, gramer özetleri

**Adımlar:**
1. Repo'yu klonlayın veya ZIP olarak indirin
2. İçeriği inceleyin (PDF, JSON, markdown dosyaları olabilir)
3. Ders içeriklerini `assets/data/lessons/lessons.json` formatına dönüştürün
4. Okuma metinlerini `assets/data/readings/readings.json` formatına dönüştürün
5. Gramer özetlerini `assets/data/grammar/grammar.json` formatına dönüştürün

### 2. German Vocabulary
**Kaynak:** https://github.com/korayustundag/german-vocabulary
**Kullanım:** A1-B2 kelime listeleri (Türkçe anlamlı)

**Adımlar:**
1. Repo'yu klonlayın
2. `A1.json`, `A2.json`, `B1.json`, `B2.json` dosyalarını bulun
3. Bu dosyaları `assets/data/vocabulary/` klasörüne kopyalayın
4. Format kontrolü yapın (word, meaning_tr, level alanları olmalı)

**Beklenen Format:**
```json
[
  {
    "word": "kommen",
    "meaning_tr": "gelmek",
    "level": "A1"
  }
]
```

### 3. FrequencyWords
**Kaynak:** https://github.com/hermitdave/FrequencyWords
**Kullanım:** Kelime sıklık listesi (önceliklendirme için)

**Adımlar:**
1. Repo'yu klonlayın
2. `ger_50k.txt` dosyasını bulun
3. Bu dosyayı `scripts/process_frequency.js` ile işleyin
4. Çıktı: `assets/data/frequency/frequency.json`

**Dosya Formatı:**
```
kelime sıklık_sayısı
kommen 12345
gehen 9876
```

### 4. Tatoeba
**Kaynak:** https://tatoeba.org/eng/downloads
**Kullanım:** Almanca cümle örnekleri

**Adımlar:**
1. Tatoeba indirme sayfasına gidin
2. "Sentence pairs" bölümünden Almanca-Türkçe veya Almanca-İngilizce çiftlerini indirin
3. `scripts/process_tatoeba.js` ile filtreleyin ve işleyin
4. Çıktı: `assets/data/sentences/tatoeba_filtered.json`

**Filtreleme Kriterleri:**
- A1-A2 seviyesine uygun kısa cümleler
- Maksimum 15-20 kelime
- Türkçe çevirisi olanlar

## 🔧 Veri İşleme Scriptleri

Scriptler `scripts/` klasöründe bulunur:
- `process_frequency.js` - FrequencyWords işleme
- `process_tatoeba.js` - Tatoeba filtreleme
- `validate_data.js` - Veri doğrulama

## 📁 Dosya Yapısı

```
assets/data/
├── lessons/
│   └── lessons.json          # Tüm dersler
├── vocabulary/
│   ├── A1.json               # A1 kelimeleri
│   ├── A2.json               # A2 kelimeleri
│   ├── B1.json               # B1 kelimeleri
│   └── B2.json               # B2 kelimeleri
├── sentences/
│   └── tatoeba_filtered.json # Filtrelenmiş cümleler
├── readings/
│   └── readings.json         # Okuma metinleri
├── grammar/
│   └── grammar.json          # Gramer konuları
└── frequency/
    └── frequency.json         # Kelime sıklık listesi
```

## ✅ Kontrol Listesi

- [ ] German-Resources içeriği indirildi ve işlendi
- [ ] German Vocabulary A1-B2 dosyaları eklendi
- [ ] FrequencyWords işlendi ve entegre edildi
- [ ] Tatoeba cümleleri filtrelendi ve eklendi
- [ ] Tüm JSON dosyaları doğrulandı
- [ ] Uygulama test edildi







