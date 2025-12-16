// Yeni format (7k Sentences)
export interface Sentence {
  id: number;
  german_sentence: string;
  english_translation: string;
  audio_path?: string | null;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  practiced?: boolean;
  practiced_date?: string;
  daily_reviewed_date?: string; // Bugün değerlendirilme tarihi (Dashboard sayaç için)
  next_review_date?: string; // Bir sonraki tekrar tarihi (spaced repetition)
  review_count?: number; // Kaç kez tekrar edildi
  // Eski format desteği (backward compatibility)
  de?: string;
  tr?: string;
  en?: string;
  source?: 'tatoeba' | 'german-resources' | 'anki' | 'langenscheidt';
}

