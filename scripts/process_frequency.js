/**
 * FrequencyWords verisini işler ve JSON formatına dönüştürür
 * 
 * Kullanım:
 * node scripts/process_frequency.js
 * 
 * Gereksinimler:
 * - ger_50k.txt dosyası scripts/ klasöründe olmalı
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'ger_50k.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'data', 'frequency', 'frequency.json');

// Klasörü oluştur
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('FrequencyWords işleniyor...');

try {
  // Dosyayı oku
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const frequencyData = [];
  
  lines.forEach((line, index) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const word = parts[0].toLowerCase();
      const frequency = parseInt(parts[1], 10);
      
      if (word && !isNaN(frequency)) {
        frequencyData.push({
          word: word,
          frequency: frequency,
          rank: index + 1
        });
      }
    }
  });
  
  // JSON olarak kaydet
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(frequencyData, null, 2), 'utf-8');
  
  console.log(`✅ ${frequencyData.length} kelime işlendi`);
  console.log(`📁 Çıktı: ${OUTPUT_FILE}`);
  console.log(`\nİlk 10 kelime:`);
  frequencyData.slice(0, 10).forEach(item => {
    console.log(`  ${item.rank}. ${item.word} (${item.frequency})`);
  });
  
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.log('\n💡 İpucu: ger_50k.txt dosyasını scripts/ klasörüne kopyalayın');
  process.exit(1);
}







