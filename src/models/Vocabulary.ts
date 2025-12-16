// Yeni format (Langenscheidt)
export interface Vocabulary {
  id: number;
  german: string;
  english: string;
  article?: string;
  pronunciation?: string;
  type?: string;
  example_sentence?: string;
  example_translation?: string;
  audio_path?: string | null;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  known: boolean;
  review_count?: number;
  last_reviewed?: string;
  // Test sistemi için yeni alanlar
  correct_count?: number; // Vocabulary swipe için doğru cevap sayısı
  wrong_count?: number; // Vocabulary swipe için yanlış cevap sayısı
  test_correct_count?: number; // Test ekranında doğru cevap sayısı (AYRI TAKİP)
  test_wrong_count?: number; // Test ekranında yanlış cevap sayısı (AYRI TAKİP)
  difficulty_level?: number; // Zorluk seviyesi (1-5, sık yanlış yapılanlar daha yüksek)
  next_review_date?: string; // Bir sonraki tekrar tarihi (spaced repetition)
  learned_date?: string; // İlk öğrenme tarihi (known: true olduğunda)
  daily_reviewed_date?: string; // Bugün değerlendirilme tarihi (Dashboard sayaç için)
  // Eski format desteği (backward compatibility)
  word?: string;
  meaning_tr?: string;
  freq_rank?: number;
}

