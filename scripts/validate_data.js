/**
 * Tüm veri dosyalarını doğrular
 * 
 * Kullanım:
 * node scripts/validate_data.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'assets', 'data');

console.log('📋 Veri dosyaları doğrulanıyor...\n');

const checks = {
  lessons: {
    file: path.join(DATA_DIR, 'lessons', 'lessons.json'),
    required: ['id', 'level', 'title', 'goal', 'vocab_keys', 'dialogue', 'examples'],
    minCount: 1
  },
  vocabulary: {
    files: ['A1.json', 'A2.json', 'B1.json', 'B2.json'],
    required: ['word', 'meaning_tr', 'level'],
    minCount: 10
  },
  sentences: {
    file: path.join(DATA_DIR, 'sentences', 'tatoeba_filtered.json'),
    required: ['id', 'de', 'tr', 'level'],
    minCount: 10
  },
  readings: {
    file: path.join(DATA_DIR, 'readings', 'readings.json'),
    required: ['id', 'level', 'title', 'text_de', 'text_tr', 'questions'],
    minCount: 1
  },
  grammar: {
    file: path.join(DATA_DIR, 'grammar', 'grammar.json'),
    required: ['topic', 'level', 'explanation_tr', 'examples'],
    minCount: 1
  },
  frequency: {
    file: path.join(DATA_DIR, 'frequency', 'frequency.json'),
    required: ['word', 'frequency', 'rank'],
    minCount: 100
  }
};

let allValid = true;

// Lessons kontrolü
console.log('📚 Dersler kontrol ediliyor...');
try {
  const data = JSON.parse(fs.readFileSync(checks.lessons.file, 'utf-8'));
  if (!Array.isArray(data) || data.length < checks.lessons.minCount) {
    console.log(`  ❌ En az ${checks.lessons.minCount} ders olmalı (şu an: ${data.length})`);
    allValid = false;
  } else {
    const first = data[0];
    const missing = checks.lessons.required.filter(key => !(key in first));
    if (missing.length > 0) {
      console.log(`  ❌ Eksik alanlar: ${missing.join(', ')}`);
      allValid = false;
    } else {
      console.log(`  ✅ ${data.length} ders bulundu`);
    }
  }
} catch (error) {
  console.log(`  ❌ Dosya okunamadı: ${error.message}`);
  allValid = false;
}

// Vocabulary kontrolü
console.log('\n📖 Kelimeler kontrol ediliyor...');
checks.vocabulary.files.forEach(fileName => {
  const filePath = path.join(DATA_DIR, 'vocabulary', fileName);
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(data) || data.length < checks.vocabulary.minCount) {
        console.log(`  ⚠️  ${fileName}: En az ${checks.vocabulary.minCount} kelime olmalı (şu an: ${data.length})`);
      } else {
        const first = data[0];
        const missing = checks.vocabulary.required.filter(key => !(key in first));
        if (missing.length > 0) {
          console.log(`  ❌ ${fileName}: Eksik alanlar: ${missing.join(', ')}`);
          allValid = false;
        } else {
          console.log(`  ✅ ${fileName}: ${data.length} kelime`);
        }
      }
    } else {
      console.log(`  ⚠️  ${fileName}: Dosya bulunamadı`);
    }
  } catch (error) {
    console.log(`  ❌ ${fileName}: ${error.message}`);
    allValid = false;
  }
});

// Sentences kontrolü
console.log('\n💬 Cümleler kontrol ediliyor...');
try {
  if (fs.existsSync(checks.sentences.file)) {
    const data = JSON.parse(fs.readFileSync(checks.sentences.file, 'utf-8'));
    if (!Array.isArray(data) || data.length < checks.sentences.minCount) {
      console.log(`  ⚠️  En az ${checks.sentences.minCount} cümle olmalı (şu an: ${data.length})`);
    } else {
      const first = data[0];
      const missing = checks.sentences.required.filter(key => !(key in first));
      if (missing.length > 0) {
        console.log(`  ❌ Eksik alanlar: ${missing.join(', ')}`);
        allValid = false;
      } else {
        console.log(`  ✅ ${data.length} cümle bulundu`);
      }
    }
  } else {
    console.log(`  ⚠️  Dosya bulunamadı`);
  }
} catch (error) {
  console.log(`  ❌ ${error.message}`);
  allValid = false;
}

// Frequency kontrolü
console.log('\n📊 Kelime sıklık listesi kontrol ediliyor...');
try {
  if (fs.existsSync(checks.frequency.file)) {
    const data = JSON.parse(fs.readFileSync(checks.frequency.file, 'utf-8'));
    if (!Array.isArray(data) || data.length < checks.frequency.minCount) {
      console.log(`  ⚠️  En az ${checks.frequency.minCount} kelime olmalı (şu an: ${data.length})`);
    } else {
      console.log(`  ✅ ${data.length} kelime bulundu`);
    }
  } else {
    console.log(`  ⚠️  Dosya bulunamadı (opsiyonel)`);
  }
} catch (error) {
  console.log(`  ⚠️  ${error.message} (opsiyonel)`);
}

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('✅ Tüm kritik veriler geçerli!');
} else {
  console.log('⚠️  Bazı veriler eksik veya hatalı. Lütfen kontrol edin.');
}
console.log('='.repeat(50));







