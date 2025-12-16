/**
 * Anki deck CSV dosyalarını JSON formatına dönüştürür
 * 
 * Kullanım:
 * node scripts/process_anki_decks.js
 * 
 * Gereksinimler:
 * - CSV dosyaları scripts/anki_data/ klasöründe olmalı
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'anki_data');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'data');

// Hedefler (seviye bazlı)
const TARGETS = {
  A1: { vocab: 500, sentences: 300, grammar: 50 },
  A2: { vocab: 1000, sentences: 600, grammar: 100 },
  B1: { vocab: 1500, sentences: 1000, reading: 20, listening: 20 },
  B2: { vocab: 2000, sentences: 1500, reading: 40, listening: 40 },
};

// Dosya eşleştirmeleri
const FILE_MAPPINGS = [
  { input: 'a1_vocab.csv', output: 'vocabulary/A1.json', type: 'vocab', level: 'A1' },
  { input: 'a1_sentences.csv', output: 'sentences/A1.json', type: 'sentences', level: 'A1' },
  { input: 'a1_grammar.csv', output: 'grammar/A1.json', type: 'grammar', level: 'A1' },
  { input: 'a2_vocab.csv', output: 'vocabulary/A2.json', type: 'vocab', level: 'A2' },
  { input: 'a2_sentences.csv', output: 'sentences/A2.json', type: 'sentences', level: 'A2' },
  { input: 'a2_grammar.csv', output: 'grammar/A2.json', type: 'grammar', level: 'A2' },
  { input: 'b1_vocab.csv', output: 'vocabulary/B1.json', type: 'vocab', level: 'B1' },
  { input: 'b1_sentences.csv', output: 'sentences/B1.json', type: 'sentences', level: 'B1' },
  { input: 'b1_reading.csv', output: 'readings/B1.json', type: 'reading', level: 'B1' },
  { input: 'b1_listening.csv', output: 'listening/B1.json', type: 'listening', level: 'B1' },
  { input: 'b2_vocab.csv', output: 'vocabulary/B2.json', type: 'vocab', level: 'B2' },
  { input: 'b2_sentences.csv', output: 'sentences/B2.json', type: 'sentences', level: 'B2' },
  { input: 'b2_reading.csv', output: 'readings/B2.json', type: 'reading', level: 'B2' },
  { input: 'b2_listening.csv', output: 'listening/B2.json', type: 'listening', level: 'B2' },
];

/**
 * HTML etiketlerini temizle
 */
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '') // HTML etiketlerini kaldır
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * CSV satırını parse et
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Vocabulary CSV'sini işle
 */
function processVocabCSV(content, level) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // İlk satır header olabilir
  const startIndex = lines[0].toLowerCase().includes('front') ? 1 : 0;
  
  const vocab = [];
  let id = 1;
  
  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 2) continue;
    
    const word = cleanHtml(fields[0]);
    const meaning = cleanHtml(fields[1] || fields[0]);
    
    if (word) {
      vocab.push({
        id: id++,
        word: word,
        meaning_tr: meaning,
        level: level,
        known: false,
        review_count: 0,
      });
    }
  }
  
  return vocab;
}

/**
 * Sentences CSV'sini işle
 */
function processSentencesCSV(content, level) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const startIndex = lines[0].toLowerCase().includes('front') ? 1 : 0;
  
  const sentences = [];
  let id = 1000;
  
  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 2) continue;
    
    const de = cleanHtml(fields[0]);
    const tr = cleanHtml(fields[1] || '');
    const en = cleanHtml(fields[2] || '');
    
    if (de) {
      sentences.push({
        id: id++,
        de: de,
        tr: tr,
        en: en,
        level: level,
        source: 'anki',
        practiced: false,
      });
    }
  }
  
  return sentences;
}

/**
 * Grammar CSV'sini işle
 */
function processGrammarCSV(content, level) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const startIndex = lines[0].toLowerCase().includes('front') ? 1 : 0;
  
  const grammar = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 2) continue;
    
    const topic = cleanHtml(fields[0]);
    const explanation = cleanHtml(fields[1] || '');
    const examples = cleanHtml(fields[2] || '');
    
    if (topic) {
      // Örnekleri parse et (varsa)
      const exampleList = examples ? examples.split('\n').map(e => {
        const parts = e.split('→').map(p => p.trim());
        return {
          de: parts[0] || '',
          tr: parts[1] || '',
        };
      }).filter(e => e.de) : [];
      
      grammar.push({
        topic: topic,
        level: level,
        explanation_tr: explanation,
        examples: exampleList,
      });
    }
  }
  
  return grammar;
}

/**
 * Reading CSV'sini işle
 */
function processReadingCSV(content, level) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const startIndex = lines[0].toLowerCase().includes('front') ? 1 : 0;
  
  const readings = [];
  let id = 1;
  
  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 2) continue;
    
    const text_de = cleanHtml(fields[0]);
    const text_tr = cleanHtml(fields[1] || '');
    const title = cleanHtml(fields[2] || `Okuma ${id}`);
    
    if (text_de && text_de.length > 50) { // En az 50 karakter
      readings.push({
        id: id++,
        level: level,
        title: title,
        text_de: text_de,
        text_tr: text_tr,
        questions: [], // Anki'de soru yoksa boş
        completed: false,
      });
    }
  }
  
  return readings;
}

/**
 * Listening CSV'sini işle
 */
function processListeningCSV(content, level) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const startIndex = lines[0].toLowerCase().includes('front') ? 1 : 0;
  
  const listening = [];
  let id = 1;
  
  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 2) continue;
    
    const transcript = cleanHtml(fields[0]);
    const translation = cleanHtml(fields[1] || '');
    const title = cleanHtml(fields[2] || `Dinleme ${id}`);
    
    if (transcript) {
      listening.push({
        id: id++,
        level: level,
        title: title,
        transcript_de: transcript,
        transcript_tr: translation,
        audio_url: null, // Anki'den ses dosyası ayrı indirilmeli
        completed: false,
      });
    }
  }
  
  return listening;
}

// Ana işlem
console.log('🔄 Anki deck'leri işleniyor...\n');

if (!fs.existsSync(INPUT_DIR)) {
  console.error(`❌ Klasör bulunamadı: ${INPUT_DIR}`);
  console.log('\n💡 İpucu:');
  console.log('   1. scripts/anki_data/ klasörünü oluşturun');
  console.log('   2. Anki\'den export ettiğiniz CSV dosyalarını bu klasöre kopyalayın');
  process.exit(1);
}

let processedCount = 0;
let skippedCount = 0;

FILE_MAPPINGS.forEach(mapping => {
  const inputPath = path.join(INPUT_DIR, mapping.input);
  const outputPath = path.join(OUTPUT_DIR, mapping.output);
  
  // Çıktı klasörünü oluştur
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  ${mapping.input} bulunamadı (atlandı)`);
    skippedCount++;
    return;
  }
  
  try {
    const content = fs.readFileSync(inputPath, 'utf-8');
    let data = [];
    
    switch (mapping.type) {
      case 'vocab':
        data = processVocabCSV(content, mapping.level);
        break;
      case 'sentences':
        data = processSentencesCSV(content, mapping.level);
        break;
      case 'grammar':
        data = processGrammarCSV(content, mapping.level);
        break;
      case 'reading':
        data = processReadingCSV(content, mapping.level);
        break;
      case 'listening':
        data = processListeningCSV(content, mapping.level);
        break;
    }
    
    // JSON olarak kaydet
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    
    const target = TARGETS[mapping.level]?.[mapping.type] || 0;
    const status = target > 0 && data.length >= target ? '✅' : '⚠️';
    
    console.log(`${status} ${mapping.input} → ${data.length} öğe (hedef: ${target || 'N/A'})`);
    processedCount++;
    
  } catch (error) {
    console.error(`❌ ${mapping.input} işlenirken hata: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`✅ ${processedCount} dosya işlendi`);
if (skippedCount > 0) {
  console.log(`⚠️  ${skippedCount} dosya atlandı`);
}
console.log('='.repeat(50));







