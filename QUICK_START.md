# 🚀 Hızlı Başlangıç - Veri Kurulumu

## 5 Dakikada Veri Kurulumu

### Adım 1: German Vocabulary (2 dakika)

1. https://github.com/korayustundag/german-vocabulary sayfasını aç
2. Yeşil "Code" → "Download ZIP"
3. ZIP'i aç, içindeki `A1.json`, `A2.json`, `B1.json`, `B2.json` dosyalarını bul
4. Bu 4 dosyayı şuraya kopyala: `D:\GermanApp\assets\data\vocabulary\`

✅ **Tamamlandı!** Artık kelimeler çalışıyor.

---

### Adım 2: FrequencyWords (3 dakika)

1. https://github.com/hermitdave/FrequencyWords sayfasını aç
2. "Code" → "Download ZIP"
3. ZIP'i aç, `data/ger/ger_50k.txt` dosyasını bul
4. Bu dosyayı şuraya kopyala: `D:\GermanApp\scripts\ger_50k.txt`
5. Terminal'de şunu çalıştır:
   ```bash
   cd D:\GermanApp
   node scripts/process_frequency.js
   ```

✅ **Tamamlandı!** Kelime önceliklendirme çalışıyor.

---

### Adım 3: Tatoeba (Opsiyonel - 5 dakika)

1. https://tatoeba.org/eng/downloads sayfasını aç
2. "Sentences" bölümünden "German" (deu) dosyasını indir
3. Dosyayı şuraya kopyala: `D:\GermanApp\scripts\sentences.csv`
4. Terminal'de:
   ```bash
   node scripts/process_tatoeba.js
   ```

✅ **Tamamlandı!** Cümleler çalışıyor.

---

### Adım 4: Kontrol Et

```bash
node scripts/validate_data.js
```

Tüm dosyalar hazırsa ✅ işareti görürsünüz.

---

## 🎉 Hazır!

Artık uygulamanız gerçek verilerle çalışıyor:
- ✅ 1000+ kelime (A1-B2)
- ✅ Kelime önceliklendirme
- ✅ 1000+ cümle örneği

**German-Resources** sonra eklenebilir (manuel işlem gerektirir).







