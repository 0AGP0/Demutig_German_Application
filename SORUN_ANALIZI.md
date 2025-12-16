# 🔍 Cümle Yükleme Sorunu - Analiz

## Sorun
- Cümleler gözükmüyor
- "Cümle bulunamadı" mesajı
- Log'larda: `Loaded sentences: 1` ama tüm alanlar `undefined`

## Olası Nedenler

### 1. Metro Bundler Cache Sorunu
- Metro bundler yanlış dosyayı yüklüyor olabilir
- Cache temizlenmemiş olabilir

### 2. JSON Dosyası Sorunu
- Dosya var ama içeriği bozuk olabilir
- Dosya çok büyük (7019 cümle) ve Metro bundler yükleyemiyor olabilir

### 3. Require Path Sorunu
- `require('../../assets/data/sentences_7000.json')` yolu yanlış olabilir
- Metro bundler dosyayı bulamıyor olabilir

### 4. Seviye Filtresi Sorunu
- Dashboard'dan `currentLevel` ile çağrılıyor
- Eğer seviye A1 ise ama JSON'da A1 cümlesi yoksa boş döner

## Çözüm Önerileri

1. JSON dosyasını kontrol et ve yeniden oluştur
2. Require path'ini kontrol et
3. Metro bundler cache'ini temizle
4. Seviye filtresini kaldır (test için)
5. JSON dosyasını böl (çok büyükse)







