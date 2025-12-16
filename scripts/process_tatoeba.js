/**
 * Tatoeba verisini filtreler ve JSON formatına dönüştürür
 * 
 * Kullanım:
 * node scripts/process_tatoeba.js
 * 
 * Gereksinimler:
 * - Tatoeba sentence pairs dosyası scripts/ klasöründe olmalı
 * - Dosya adı: sentences.csv veya benzeri
 */

const fs = require('fs');
const path = require('path');

// Dosya adlarını buraya girin
const SENTENCES_FILE = path.join(__dirname, 'sentences.csv');
const LINKS_FILE = path.join(__dirname, 'links.csv'); // Cümle çiftleri için
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'data', 'sentences', 'tatoeba_filtered.json');

// Klasörü oluştur
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Tatoeba verisi işleniyor...');

/**
 * Cümle uzunluğunu kontrol eder (A1-A2 için uygun mu?)
 */
function isSimpleSentence(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return words.length <= 15 && words.length >= 3;
}

/**
 * Cümle seviyesini tahmin eder (basit bir heuristik)
 */
function estimateLevel(text) {
  const words = text.split(/\s+/).length;
  if (words <= 8) return 'A1';
  if (words <= 12) return 'A2';
  return 'B1';
}

try {
  // Cümleleri oku (Tatoeba formatı: id, lang, text)
  const sentencesContent = fs.readFileSync(SENTENCES_FILE, 'utf-8');
  const sentences = {};
  
  sentencesContent.split('\n').forEach(line => {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const id = parts[0];
      const lang = parts[1];
      const text = parts.slice(2).join('\t').trim();
      
      if (lang === 'deu' || lang === 'eng' || lang === 'tur') {
        if (!sentences[id]) {
          sentences[id] = {};
        }
        sentences[id][lang] = text;
      }
    }
  });
  
  // Filtrele ve işle
  const filtered = [];
  let idCounter = 1000;
  
  Object.keys(sentences).forEach(sentenceId => {
    const sentence = sentences[sentenceId];
    
    // Almanca cümle var mı?
    if (sentence.deu) {
      const deText = sentence.deu;
      
      // Basit cümle mi?
      if (isSimpleSentence(deText)) {
        const level = estimateLevel(deText);
        
        filtered.push({
          id: idCounter++,
          de: deText,
          tr: sentence.tur || '',
          en: sentence.eng || '',
          level: level,
          source: 'tatoeba'
        });
      }
    }
  });
  
  // İlk 1000 tanesini al (çok büyük olmasın)
  const limited = filtered.slice(0, 1000);
  
  // JSON olarak kaydet
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(limited, null, 2), 'utf-8');
  
  console.log(`✅ ${limited.length} cümle filtrelendi`);
  console.log(`📁 Çıktı: ${OUTPUT_FILE}`);
  console.log(`\nSeviye dağılımı:`);
  const levelCount = limited.reduce((acc, s) => {
    acc[s.level] = (acc[s.level] || 0) + 1;
    return acc;
  }, {});
  Object.keys(levelCount).forEach(level => {
    console.log(`  ${level}: ${levelCount[level]} cümle`);
  });
  
  console.log(`\nİlk 5 örnek:`);
  limited.slice(0, 5).forEach(s => {
    console.log(`  ${s.de} → ${s.tr || s.en}`);
  });
  
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.log('\n💡 İpucu:');
  console.log('  1. Tatoeba indirme sayfasından sentences.csv dosyasını indirin');
  console.log('  2. Dosyayı scripts/ klasörüne kopyalayın');
  console.log('  3. Scripti tekrar çalıştırın');
  process.exit(1);
}







