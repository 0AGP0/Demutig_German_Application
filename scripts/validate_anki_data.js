/**
 * Anki verilerini doğrular ve hedef kontrolü yapar
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'assets', 'data');

const TARGETS = {
  A1: { vocab: 500, sentences: 300, grammar: 50 },
  A2: { vocab: 1000, sentences: 600, grammar: 100 },
  B1: { vocab: 1500, sentences: 1000, reading: 20, listening: 20 },
  B2: { vocab: 2000, sentences: 1500, reading: 40, listening: 40 },
};

console.log('📊 Anki Veri Doğrulama\n');

const checks = [
  { file: 'vocabulary/A1.json', level: 'A1', type: 'vocab' },
  { file: 'vocabulary/A2.json', level: 'A2', type: 'vocab' },
  { file: 'vocabulary/B1.json', level: 'B1', type: 'vocab' },
  { file: 'vocabulary/B2.json', level: 'B2', type: 'vocab' },
  { file: 'sentences/A1.json', level: 'A1', type: 'sentences' },
  { file: 'sentences/A2.json', level: 'A2', type: 'sentences' },
  { file: 'sentences/B1.json', level: 'B1', type: 'sentences' },
  { file: 'sentences/B2.json', level: 'B2', type: 'sentences' },
  { file: 'grammar/A1.json', level: 'A1', type: 'grammar' },
  { file: 'grammar/A2.json', level: 'A2', type: 'grammar' },
  { file: 'readings/B1.json', level: 'B1', type: 'reading' },
  { file: 'readings/B2.json', level: 'B2', type: 'reading' },
  { file: 'listening/B1.json', level: 'B1', type: 'listening' },
  { file: 'listening/B2.json', level: 'B2', type: 'listening' },
];

let totalItems = 0;
let onTarget = 0;
let belowTarget = 0;
let missing = 0;

checks.forEach(check => {
  const filePath = path.join(DATA_DIR, check.file);
  const target = TARGETS[check.level]?.[check.type] || 0;
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${check.file} - Dosya bulunamadı`);
    missing++;
    return;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const count = Array.isArray(data) ? data.length : 0;
    totalItems += count;
    
    if (target === 0) {
      console.log(`✅ ${check.file} - ${count} öğe (hedef yok)`);
    } else if (count >= target) {
      console.log(`✅ ${check.file} - ${count} öğe (hedef: ${target})`);
      onTarget++;
    } else {
      const percentage = Math.round((count / target) * 100);
      console.log(`⚠️  ${check.file} - ${count} öğe (hedef: ${target}, %${percentage})`);
      belowTarget++;
    }
  } catch (error) {
    console.log(`❌ ${check.file} - Hata: ${error.message}`);
    missing++;
  }
});

console.log('\n' + '='.repeat(50));
console.log(`📊 Toplam: ${totalItems} öğe`);
console.log(`✅ Hedefi karşılayan: ${onTarget} dosya`);
console.log(`⚠️  Hedefin altında: ${belowTarget} dosya`);
console.log(`❌ Eksik: ${missing} dosya`);
console.log('='.repeat(50));







