# 🎵 Ses Dosyaları Kurulum Rehberi

## 📋 Adımlar

### 1. Anki Media Klasörünü Bul

Anki media klasörü genellikle şu konumlarda bulunur:

**Windows:**
```
%APPDATA%\Anki2\User 1\collection.media
```
Örnek: `C:\Users\pc\AppData\Roaming\Anki2\User 1\collection.media`

**macOS:**
```
~/Library/Application Support/Anki2/User 1/collection.media
```

**Linux:**
```
~/.local/share/Anki2/User 1/collection.media
```

### 2. Script'i Çalıştır

Terminal'de şu komutu çalıştır:

```bash
cd D:\GermanApp
node scripts/copy_audio_files.js
```

Eğer varsayılan konum çalışmazsa, Anki media klasörü yolunu manuel olarak belirt:

```bash
node scripts/copy_audio_files.js "C:\Users\pc\AppData\Roaming\Anki2\User 1\collection.media"
```

### 3. Script Ne Yapar?

- JSON dosyasından tüm ses dosyası adlarını okur
- Anki media klasöründen ses dosyalarını bulur
- `assets/audio/` klasörüne kopyalar
- Kopyalanan ve bulunamayan dosyaların listesini gösterir

### 4. Kontrol Et

Script çalıştıktan sonra:

```bash
# assets/audio klasöründe dosyalar olmalı
dir assets\audio
```

### 5. Metro Bundler'ı Yeniden Başlat

Ses dosyaları eklendikten sonra:

```bash
npx expo start --clear
```

## ⚠️ Notlar

- Ses dosyaları çok büyük olabilir (binlerce MP3 dosyası)
- Kopyalama işlemi biraz zaman alabilir
- Eğer bazı ses dosyaları bulunamazsa, Anki'de farklı bir media klasörü kullanıyor olabilirsiniz
- Production build'de ses dosyaları bundle'a dahil edilir

## 🔧 Sorun Giderme

### Ses dosyaları bulunamıyor

1. Anki'yi açın
2. Tools → Media... menüsüne gidin
3. Media klasörü yolunu kontrol edin
4. Script'i bu yol ile çalıştırın

### Ses oynatılamıyor

1. `assets/audio/` klasöründe dosyaların olduğundan emin olun
2. Metro bundler'ı `--clear` ile yeniden başlatın
3. Uygulamayı yeniden yükleyin

## 📊 Beklenen Sonuç

Script başarıyla çalıştıktan sonra:
- ✅ `assets/audio/` klasöründe binlerce MP3 dosyası olmalı
- ✅ Uygulamada "Dinle" butonuna basınca ses çalmalı
- ✅ Listening Active Mode'da ses dosyaları oynatılabilmeli
