/**
 * German 7k Sentences dosyalarını işler ve JSON formatına dönüştürür
 * 
 * Kullanım:
 * node scripts/process_langenscheidt_sentences.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE_1 = path.join(__dirname, '..', 'german 7k sentences intermediate_advanced I.txt');
const INPUT_FILE_2 = path.join(__dirname, '..', 'german 7k sentences intermediate_advanced II.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'data', 'sentences', 'sentences_data_7k.json');

console.log('🔄 German 7k Sentences işleniyor...\n');

/**
 * HTML etiketlerini temizle
 */
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<br>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[sound:[^\]]+\]/g, '') // Ses dosyası referanslarını kaldır
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/—/g, '')
    .trim();
}

/**
 * Ses dosyası referansını çıkar
 */
function extractAudio(text) {
  const match = text.match(/\[sound:([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Dosyayı işle
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  const sentences = [];
  let id = 1;
  
  lines.forEach(line => {
    const parts = line.split('\t').filter(p => p.trim());
    if (parts.length < 2) return;
    
    // İlk kısım: Almanca cümle
    const germanRaw = parts[0];
    const german = cleanHtml(germanRaw);
    
    // İkinci kısım: İngilizce çeviri
    const englishRaw = parts[1];
    const english = cleanHtml(englishRaw);
    
    // Ses dosyası (varsa)
    const audioMatch = line.match(/\[sound:([^\]]+)\]/);
    const audioPath = audioMatch ? audioMatch[1] : null;
    
    if (german && english && german.length > 10) { // En az 10 karakter
      sentences.push({
        id: id++,
        german_sentence: german,
        english_translation: english,
        audio_path: audioPath,
        practiced: false,
        level: estimateLevel(german), // Seviye tahmini
      });
    }
  });
  
  return sentences;
}

/**
 * Cümle seviyesini tahmin et (basit heuristik)
 */
function estimateLevel(text) {
  const words = text.split(/\s+/).length;
  const hasComplexGrammar = /dass|wenn|obwohl|trotzdem|deshalb/i.test(text);
  
  if (words <= 8 && !hasComplexGrammar) return 'A1';
  if (words <= 12 && !hasComplexGrammar) return 'A2';
  if (words <= 18) return 'B1';
  return 'B2';
}

try {
  // Her iki dosyayı işle
  console.log('📄 Dosya 1 işleniyor...');
  const sentences1 = processFile(INPUT_FILE_1);
  console.log(`   ✅ ${sentences1.length} cümle bulundu`);
  
  console.log('📄 Dosya 2 işleniyor...');
  const sentences2 = processFile(INPUT_FILE_2);
  console.log(`   ✅ ${sentences2.length} cümle bulundu`);
  
  // Birleştir ve ID'leri düzelt
  const allSentences = [...sentences1];
  let nextId = sentences1.length + 1;
  
  sentences2.forEach(s => {
    s.id = nextId++;
    allSentences.push(s);
  });
  
  // JSON olarak kaydet
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allSentences, null, 2), 'utf-8');
  
  // İstatistikler
  const levelCount = allSentences.reduce((acc, s) => {
    acc[s.level] = (acc[s.level] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Toplam ${allSentences.length} cümle işlendi`);
  console.log(`📁 Çıktı: ${OUTPUT_FILE}`);
  console.log('\n📊 Seviye dağılımı:');
  Object.keys(levelCount).forEach(level => {
    console.log(`   ${level}: ${levelCount[level]} cümle`);
  });
  console.log('\n🎵 Ses dosyası olan:');
  const withAudio = allSentences.filter(s => s.audio_path).length;
  console.log(`   ${withAudio} cümle (${Math.round(withAudio/allSentences.length*100)}%)`);
  console.log('='.repeat(50));
  
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.log('\n💡 İpucu:');
  console.log('   Dosyaların proje kök dizininde olduğundan emin olun:');
  console.log('   - german 7k sentences intermediate_advanced I.txt');
  console.log('   - german 7k sentences intermediate_advanced II.txt');
  process.exit(1);
}

