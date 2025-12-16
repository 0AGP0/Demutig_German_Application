export interface LevelProgress {
  vocab_completed: number;
  vocab_target: number;
  sentences_completed: number;
  sentences_target: number;
  grammar_completed: number;
  grammar_target: number;
  reading_completed: number;
  reading_target: number;
  listening_completed: number;
  listening_target: number;
  percentage: number; // Genel ilerleme yüzdesi
}

export interface UserProgress {
  total_words_learned: number;
  total_sentences_practiced: number;
  total_readings_completed: number;
  total_listening_completed: number;
  streak_days: number;
  last_study_date: string;
  level_progress: {
    A1: LevelProgress;
    A2: LevelProgress;
    B1: LevelProgress;
    B2: LevelProgress;
  };
  current_level: 'A1' | 'A2' | 'B1' | 'B2';
  daily_goal: {
    // Eski/Progress ekranı için
    cards?: number; // Günlük kart sayısı (A1-A2 için)
    reading_or_listening?: number; // Günlük okuma veya dinleme (B1-B2 için)
    // Dashboard için
    lessons?: number;
    words?: number;
    sentences?: number;
    minutes?: number;
  };
}

