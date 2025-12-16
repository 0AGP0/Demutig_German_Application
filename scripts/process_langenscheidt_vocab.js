/**
 * Langenscheidt Basic German Vocabulary dosyasını işler
 * 
 * Kullanım:
 * node scripts/process_langenscheidt_vocab.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'Langenscheidt Basic German Vocabulary.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'data', 'vocab_langenscheidt.json');

console.log('🔄 Langenscheidt Vocabulary işleniyor...\n');

/**
 * HTML etiketlerini temizle
 */
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<br>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[sound:[^\]]+\]/g, '')
    .trim();
}

/**
 * Seviye belirle (kelime sırasına göre)
 */
function determineLevel(index, total) {
  if (index < 500) return 'A1';
  if (index < 1500) return 'A2';
  if (index < 2500) return 'B1';
  return 'B2';
}

try {
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  const vocabulary = [];
  let id = 1;
  
  lines.forEach((line, index) => {
    // Tab-separated format
    const parts = line.split('\t').map(p => p.trim());
    
    if (parts.length < 6) return; // En az id, article, german, pronunciation, type, english olmalı
    
    // Format: id, article, german, pronunciation, type, english, image, note, example_de, example_en, ...
    const vocabId = parts[0] ? parseInt(parts[0], 10) || id : id;
    const article = parts[1] || '';
    const german = cleanHtml(parts[2] || '');
    const pronunciation = parts[3] || '';
    const type = parts[4] || '';
    const english = cleanHtml(parts[5] || '');
    const exampleDe = cleanHtml(parts[8] || ''); // example_de genelde 9. sütunda
    const exampleEn = cleanHtml(parts[9] || ''); // example_en genelde 10. sütunda
    
    // Ses dosyası referanslarını bul (satırın sonunda)
    const audioMatches = line.match(/\[sound:([^\]]+)\]/g);
    const audioPath = audioMatches && audioMatches.length > 0 
      ? audioMatches[0].replace(/\[sound:([^\]]+)\]/, '$1')
      : null;
    
    if (german && english) {
      const level = determineLevel(index, lines.length);
      
      vocabulary.push({
        id: vocabId,
        german: german,
        english: english,
        article: article,
        pronunciation: pronunciation,
        type: type,
        example_sentence: exampleDe,
        example_translation: exampleEn,
        audio_path: audioPath,
        level: level,
        known: false,
        review_count: 0,
      });
      
      id++;
    }
  });
  
  // JSON olarak kaydet
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vocabulary, null, 2), 'utf-8');
  
  // İstatistikler
  const levelCount = vocabulary.reduce((acc, v) => {
    acc[v.level] = (acc[v.level] || 0) + 1;
    return acc;
  }, {});
  
  console.log('='.repeat(50));
  console.log(`✅ ${vocabulary.length} kelime işlendi`);
  console.log(`📁 Çıktı: ${OUTPUT_FILE}`);
  console.log('\n📊 Seviye dağılımı:');
  Object.keys(levelCount).forEach(level => {
    console.log(`   ${level}: ${levelCount[level]} kelime`);
  });
  console.log('\n🎵 Ses dosyası olan:');
  const withAudio = vocabulary.filter(v => v.audio_path).length;
  console.log(`   ${withAudio} kelime (${Math.round(withAudio/vocabulary.length*100)}%)`);
  console.log('\n📝 Örnek cümle olan:');
  const withExample = vocabulary.filter(v => v.example_sentence).length;
  console.log(`   ${withExample} kelime (${Math.round(withExample/vocabulary.length*100)}%)`);
  console.log('='.repeat(50));
  
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.log('\n💡 İpucu:');
  console.log('   Langenscheidt Basic German Vocabulary.txt dosyasının');
  console.log('   proje kök dizininde olduğundan emin olun.');
  process.exit(1);
}

