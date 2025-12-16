# Veri İşleme Scriptleri

Bu klasördeki scriptler, harici veri kaynaklarını uygulama formatına dönüştürmek için kullanılır.

## Scriptler

### 1. process_frequency.js
FrequencyWords verisini işler.

**Kullanım:**
```bash
# 1. FrequencyWords repo'sunu klonla
git clone https://github.com/hermitdave/FrequencyWords.git

# 2. ger_50k.txt dosyasını scripts/ klasörüne kopyala
cp FrequencyWords/data/ger/ger_50k.txt scripts/

# 3. Scripti çalıştır
node scripts/process_frequency.js
```

**Çıktı:** `assets/data/frequency/frequency.json`

### 2. process_tatoeba.js
Tatoeba cümle verisini filtreler ve işler.

**Kullanım:**
```bash
# 1. Tatoeba'dan sentences.csv dosyasını indir
# https://tatoeba.org/eng/downloads

# 2. Dosyayı scripts/ klasörüne kopyala
cp sentences.csv scripts/

# 3. Scripti çalıştır
node scripts/process_tatoeba.js
```

**Çıktı:** `assets/data/sentences/tatoeba_filtered.json`

### 3. validate_data.js
Tüm veri dosyalarını doğrular.

**Kullanım:**
```bash
node scripts/validate_data.js
```

## Notlar

- Scriptler Node.js ile çalışır (npm install gerekmez, sadece fs modülü kullanır)
- Tüm scriptler hata durumunda açıklayıcı mesajlar verir
- Çıktı dosyaları otomatik olarak oluşturulur







