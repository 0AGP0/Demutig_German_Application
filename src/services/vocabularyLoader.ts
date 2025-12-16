// Bu dosya vocabulary dosyalarını yüklemek için kullanılır
// React Native'de dynamic require çalışmadığı için tüm dosyaları burada import ediyoruz

export const vocabularyData: any = {
  A1: require('../../assets/data/vocabulary/A1.json'),
  // A2, B1, B2 dosyaları eklendiğinde buraya eklenebilir:
  // A2: require('../../assets/data/vocabulary/A2.json'),
  // B1: require('../../assets/data/vocabulary/B1.json'),
  // B2: require('../../assets/data/vocabulary/B2.json'),
};

