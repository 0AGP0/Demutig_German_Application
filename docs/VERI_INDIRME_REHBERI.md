# Veri İndirme ve Kurulum Rehberi

Bu rehber, 4 veri kaynağını nasıl indirip uygulamaya ekleyeceğinizi adım adım açıklar.

## 📦 Genel Yaklaşım

**Kısa cevap:** Evet, repoları klonlayıp içindeki dosyaları alacaksınız. Ama her repo için farklı işlem yapılacak.

---

## 1️⃣ German Vocabulary (EN KOLAY - ÖNCE BUNU YAPIN)

**Kaynak:** https://github.com/korayustundag/german-vocabulary

### Adımlar:

1. **Repo'yu ziyaret et:**
   - Tarayıcıda https://github.com/korayustundag/german-vocabulary aç

2. **Dosyaları indir:**
   - Yeşil "Code" butonuna tıkla
   - "Download ZIP" seçeneğini seç
   - ZIP dosyasını bilgisayarına indir

3. **ZIP'i aç:**
   - İndirilen ZIP dosyasını aç
   - İçinde `A1.json`, `A2.json`, `B1.json`, `B2.json` dosyalarını bul

4. **Dosyaları kopyala:**
   ```
   Bu dosyaları şu klasöre kopyala:
   D:\GermanApp\assets\data\vocabulary\
   ```

5. **Kontrol et:**
   - `assets/data/vocabulary/A1.json` dosyası var mı?
   - İçinde kelimeler var mı? (JSON formatında)

**✅ Bu kadar!** German Vocabulary hazır.

---

## 2️⃣ FrequencyWords (KOLAY)

**Kaynak:** https://github.com/hermitdave/FrequencyWords

### Adımlar:

1. **Repo'yu ziyaret et:**
   - https://github.com/hermitdave/FrequencyWords aç

2. **Dosyayı bul:**
   - Repo içinde `data/ger/ger_50k.txt` dosyasını bul
   - GitHub'da dosyaya tıkla
   - "Raw" butonuna tıkla (ham dosyayı gösterir)

3. **Dosyayı indir:**
   - Tarayıcıda açılan sayfada Ctrl+S ile kaydet
   - VEYA ZIP indirip `data/ger/ger_50k.txt` dosyasını çıkar

4. **Dosyayı scripts klasörüne kopyala:**
   ```
   D:\GermanApp\scripts\ger_50k.txt
   ```

5. **Scripti çalıştır:**
   ```bash
   cd D:\GermanApp
   node scripts/process_frequency.js
   ```

6. **Kontrol et:**
   - `assets/data/frequency/frequency.json` dosyası oluştu mu?

**✅ FrequencyWords hazır!**

---

## 3️⃣ Tatoeba (ORTA ZORLUK)

**Kaynak:** https://tatoeba.org/eng/downloads

### Adımlar:

1. **İndirme sayfasına git:**
   - https://tatoeba.org/eng/downloads aç

2. **Dosyayı indir:**
   - "Sentences" bölümünde "German" (deu) seçeneğini bul
   - VEYA "Sentence pairs" bölümünden Almanca-Türkçe çiftlerini indir
   - Dosya adı: `sentences.csv` veya benzeri

3. **Dosyayı scripts klasörüne kopyala:**
   ```
   D:\GermanApp\scripts\sentences.csv
   ```

4. **Scripti çalıştır:**
   ```bash
   cd D:\GermanApp
   node scripts/process_tatoeba.js
   ```

5. **Kontrol et:**
   - `assets/data/sentences/tatoeba_filtered.json` dosyası oluştu mu?

**✅ Tatoeba hazır!**

**Not:** Tatoeba dosyası çok büyük olabilir (100MB+). Script otomatik olarak ilk 1000 cümleyi filtreler.

---

## 4️⃣ German-Resources (EN ZOR - MANUEL İŞLEM GEREKİR)

**Kaynak:** https://github.com/eymenefealtun/German-Resources

### Durum:
Bu repo muhtemelen PDF, Markdown veya farklı formatta içerik içeriyor. Bunları JSON formatına dönüştürmeniz gerekecek.

### Adımlar:

1. **Repo'yu incele:**
   - Repo'yu klonla veya ZIP indir
   - İçindeki dosyaları incele (PDF? Markdown? JSON?)

2. **İçeriği JSON'a dönüştür:**
   - Dersler → `assets/data/lessons/lessons.json` formatına
   - Okuma metinleri → `assets/data/readings/readings.json` formatına
   - Gramer → `assets/data/grammar/grammar.json` formatına

3. **Format örnekleri:**
   - `assets/data/lessons/lessons.json` dosyasına bak (zaten var)
   - Aynı formatta yeni dersler ekle

**⚠️ Bu manuel bir işlem.** Repo içeriğine göre değişir.

---

## ✅ Tüm Verileri Kontrol Et

Tüm verileri yükledikten sonra:

```bash
cd D:\GermanApp
node scripts/validate_data.js
```

Bu script tüm dosyaları kontrol eder ve eksikleri gösterir.

---

## 📋 Hızlı Kontrol Listesi

- [ ] German Vocabulary: A1.json, A2.json, B1.json, B2.json → `assets/data/vocabulary/`
- [ ] FrequencyWords: ger_50k.txt → `scripts/` → script çalıştır
- [ ] Tatoeba: sentences.csv → `scripts/` → script çalıştır
- [ ] German-Resources: Manuel olarak JSON'a dönüştür
- [ ] `node scripts/validate_data.js` çalıştır

---

## 🆘 Sorun mu var?

### "Dosya bulunamadı" hatası:
- Dosya yolunu kontrol et
- Dosya adının doğru olduğundan emin ol

### "Script çalışmıyor":
- Node.js yüklü mü? (`node --version`)
- Dosya yolu doğru mu?

### "JSON formatı hatalı":
- JSON dosyasını bir JSON validator ile kontrol et
- Virgül, tırnak işareti hatalarını kontrol et

---

## 💡 İpucu

**Öncelik sırası:**
1. ✅ German Vocabulary (en kolay, hemen çalışır)
2. ✅ FrequencyWords (script ile otomatik)
3. ✅ Tatoeba (script ile otomatik)
4. ⚠️ German-Resources (manuel, zaman alır)

İlk 3'ünü yaparsanız uygulama çalışır. German-Resources sonra eklenebilir.







