# 🎯 Yeni Plan - Basit Kurulum Rehberi

## 📋 Genel Bakış

Bu uygulama **çok basit** bir sistem:
- ✅ Kelime kartları (Biliyorum/Bilmiyorum)
- ✅ Cümle okuma (Okudum)
- ✅ Dinleme (Dinledim)
- ✅ Otomatik ilerleme takibi

**İçerik kaynakları:**
1. Langenscheidt Basic German Vocabulary
2. German 7000 Sentences (2 dosya)

## 📥 Adım 1: Dosyaları Hazırla

Dosyalarınız zaten proje kök dizininde:
- ✅ `Langenscheidt Basic German Vocabulary.txt`
- ✅ `german 7k sentences intermediate_advanced I.txt`
- ✅ `german 7k sentences intermediate_advanced II.txt`

## 🔄 Adım 2: JSON'a Dönüştür

### 2.1 Vocabulary İşle

```bash
cd D:\GermanApp
node scripts/process_langenscheidt_vocab.js
```

**Çıktı:** `assets/data/vocab_langenscheidt.json`

### 2.2 Sentences İşle

```bash
node scripts/process_langenscheidt_sentences.js
```

**Çıktı:** `assets/data/sentences_7000.json`

## ✅ Adım 3: Kontrol Et

Dosyaların oluştuğunu kontrol et:
- `assets/data/vocab_langenscheidt.json` ✅
- `assets/data/sentences_7000.json` ✅

## 📊 Seviye Kuralları

| Seviye | Kelime Aralığı | Cümle Gereksinimi |
|--------|----------------|-------------------|
| A1     | 1-500          | -                 |
| A2     | 501-1500       | -                 |
| B1     | 1501-2500      | %50 cümle         |
| B2     | 2500+          | %80 cümle         |

**İlerleme:**
- Her seviye için %80 tamamlanınca seviye geçilir
- B1-B2 için cümle ilerlemesi de gerekir

## 🎯 Hedefler

| Seviye | Kelime Hedefi | Cümle Hedefi |
|--------|---------------|--------------|
| A1     | 500           | -            |
| A2     | 1000          | -            |
| B1     | 1000          | 3500         |
| B2     | 1000+         | 3500+        |

## 📱 Uygulama Ekranları

### 1. Vocabulary
- Kart göster (Almanca → İngilizce)
- Butonlar: "Biliyorum" / "Bilmiyorum"
- Seviye seçimi: A1, A2, B1, B2

### 2. Sentences
- Cümle + İngilizce çeviri
- Ses dosyası varsa oynat
- Buton: "Okudum"

### 3. Listening
- Ses dosyası oynat
- Transcript göster
- Buton: "Dinledim"

### 4. Progress
- A1, A2, B1, B2 ilerleme yüzdeleri
- Seviye %80 dolunca tamamlandı

## 🔧 Sonraki Adımlar

1. ✅ Scriptleri çalıştır (yukarıda)
2. ⏳ DataService'i güncelle (yeni format için)
3. ⏳ Ekranları basitleştir
4. ⏳ İlerleme mantığını güncelle







