/**
 * Anki media klasörünü bulur
 * 
 * Kullanım:
 * node scripts/find_anki_media.js
 */

const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || process.env.HOME;
const ankiBasePath = path.join(appData, 'Anki2');

console.log('🔍 Anki media klasörü aranıyor...\n');
console.log(`📁 Anki base path: ${ankiBasePath}\n`);

if (!fs.existsSync(ankiBasePath)) {
  console.error(`❌ Anki2 klasörü bulunamadı: ${ankiBasePath}`);
  process.exit(1);
}

// Tüm user klasörlerini bul
const userDirs = fs.readdirSync(ankiBasePath).filter(item => {
  const itemPath = path.join(ankiBasePath, item);
  return fs.statSync(itemPath).isDirectory();
});

console.log(`📋 Bulunan user klasörleri:`);
userDirs.forEach(dir => {
  console.log(`   - ${dir}`);
});

console.log('\n🔍 Media klasörleri aranıyor...\n');

let found = false;

userDirs.forEach(userDir => {
  const mediaPath = path.join(ankiBasePath, userDir, 'collection.media');
  if (fs.existsSync(mediaPath)) {
    const files = fs.readdirSync(mediaPath);
    const mp3Files = files.filter(f => f.endsWith('.mp3'));
    console.log(`✅ BULUNDU: ${mediaPath}`);
    console.log(`   📊 Toplam dosya: ${files.length}`);
    console.log(`   🎵 MP3 dosyası: ${mp3Files.length}`);
    console.log(`   📝 İlk 5 dosya:`);
    files.slice(0, 5).forEach(file => console.log(`      - ${file}`));
    console.log('');
    found = true;
  }
});

if (!found) {
  console.log('❌ Hiçbir media klasörü bulunamadı.');
  console.log('\n💡 İpucu:');
  console.log('   Anki\'yi açın ve Tools → Media... menüsüne gidin.');
  console.log('   Media klasörü yolunu oradan görebilirsiniz.');
} else {
  console.log('✅ Script\'i şu şekilde çalıştırın:');
  console.log('   node scripts/copy_audio_files.js "YOL_BURAYA"');
}
