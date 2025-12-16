/**
 * Anki media klasöründen ses dosyalarını assets/audio klasörüne kopyalar
 * 
 * Kullanım:
 * node scripts/copy_audio_files.js [anki_media_path]
 * 
 * Örnek:
 * node scripts/copy_audio_files.js "C:\Users\pc\AppData\Roaming\Anki2\User 1\collection.media"
 */

const fs = require('fs');
const path = require('path');

// Anki media klasörü yolu (varsayılan veya argüman)
let ANKI_MEDIA_PATH = process.argv[2];

// Eğer argüman verilmediyse veya encoding sorunu varsa, otomatik bul
if (!ANKI_MEDIA_PATH || !fs.existsSync(ANKI_MEDIA_PATH)) {
  const appData = process.env.APPDATA || process.env.HOME;
  const ankiBasePath = path.join(appData, 'Anki2');
  
  if (fs.existsSync(ankiBasePath)) {
    // Tüm user klasörlerini bul
    const userDirs = fs.readdirSync(ankiBasePath).filter(item => {
      const itemPath = path.join(ankiBasePath, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    // Her user klasöründe media klasörünü ara
    for (const userDir of userDirs) {
      const mediaPath = path.join(ankiBasePath, userDir, 'collection.media');
      if (fs.existsSync(mediaPath)) {
        ANKI_MEDIA_PATH = mediaPath;
        console.log(`✅ Otomatik bulundu: ${ANKI_MEDIA_PATH}\n`);
        break;
      }
    }
  }
  
  // Hala bulunamadıysa varsayılan yolları dene
  if (!ANKI_MEDIA_PATH || !fs.existsSync(ANKI_MEDIA_PATH)) {
    const possiblePaths = [
      path.join(appData, 'Anki2', 'User 1', 'collection.media'),
      path.join(appData, 'Anki2', 'Kullanıcı 1', 'collection.media'), // Türkçe Windows
      path.join(appData, 'Anki2', 'user 1', 'collection.media'),
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        ANKI_MEDIA_PATH = possiblePath;
        break;
      }
    }
  }
}

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'audio');

// JSON dosyasından ses dosyası adlarını al
const JSON_FILE = path.join(__dirname, '..', 'assets', 'data', 'german_sentences', 'sentences_7k.json');

console.log('🎵 Ses dosyaları kopyalanıyor...\n');
console.log(`📁 Anki Media: ${ANKI_MEDIA_PATH}`);
console.log(`📁 Çıktı: ${OUTPUT_DIR}\n`);

// Anki media klasörünü kontrol et
if (!fs.existsSync(ANKI_MEDIA_PATH)) {
  console.error(`❌ Anki media klasörü bulunamadı: ${ANKI_MEDIA_PATH}`);
  console.log('\n💡 İpucu:');
  console.log('   Anki media klasörü genellikle şu konumlarda bulunur:');
  console.log('   Windows: %APPDATA%\\Anki2\\User 1\\collection.media');
  console.log('   macOS: ~/Library/Application Support/Anki2/User 1/collection.media');
  console.log('   Linux: ~/.local/share/Anki2/User 1/collection.media');
  console.log('\n   Veya scripti şu şekilde çalıştırın:');
  console.log('   node scripts/copy_audio_files.js "C:\\Users\\pc\\AppData\\Roaming\\Anki2\\User 1\\collection.media"');
  process.exit(1);
}

// JSON dosyasını oku
if (!fs.existsSync(JSON_FILE)) {
  console.error(`❌ JSON dosyası bulunamadı: ${JSON_FILE}`);
  process.exit(1);
}

const sentences = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

// Ses dosyası adlarını topla
const audioFiles = new Set();
sentences.forEach(sentence => {
  if (sentence.audio_path) {
    audioFiles.add(sentence.audio_path);
  }
});

console.log(`📊 Toplam ${audioFiles.size} benzersiz ses dosyası bulundu\n`);

// Çıktı klasörünü oluştur
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ Çıktı klasörü oluşturuldu: ${OUTPUT_DIR}\n`);
}

// Dosyaları kopyala
let copied = 0;
let notFound = 0;
const notFoundFiles = [];

audioFiles.forEach(audioFile => {
  const sourcePath = path.join(ANKI_MEDIA_PATH, audioFile);
  const destPath = path.join(OUTPUT_DIR, audioFile);
  
  if (fs.existsSync(sourcePath)) {
    try {
      fs.copyFileSync(sourcePath, destPath);
      copied++;
      if (copied % 100 === 0) {
        process.stdout.write(`\r📋 Kopyalanan: ${copied}/${audioFiles.size}`);
      }
    } catch (error) {
      console.error(`\n❌ Kopyalama hatası (${audioFile}):`, error.message);
      notFound++;
      notFoundFiles.push(audioFile);
    }
  } else {
    notFound++;
    notFoundFiles.push(audioFile);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`✅ Kopyalanan: ${copied} dosya`);
if (notFound > 0) {
  console.log(`⚠️  Bulunamayan: ${notFound} dosya`);
  if (notFoundFiles.length <= 20) {
    console.log('\n📋 Bulunamayan dosyalar:');
    notFoundFiles.forEach(file => console.log(`   - ${file}`));
  } else {
    console.log(`\n📋 İlk 20 bulunamayan dosya:`);
    notFoundFiles.slice(0, 20).forEach(file => console.log(`   - ${file}`));
    console.log(`   ... ve ${notFoundFiles.length - 20} dosya daha`);
  }
}
console.log('='.repeat(50));

if (copied > 0) {
  console.log(`\n✅ Ses dosyaları ${OUTPUT_DIR} klasörüne kopyalandı!`);
  console.log('   Artık uygulamada ses dosyaları çalışacak.');
}
