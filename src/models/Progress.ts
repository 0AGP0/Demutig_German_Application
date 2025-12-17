export interface LevelProgress {
  vocab_completed: number;
  vocab_target: number;
  sentences_completed: number;
  sentences_target: number;
  percentage: number; // Genel ilerleme yüzdesi
}

export interface UserProgress {
  total_words_learned: number;
  total_sentences_practiced: number;
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
    // Dashboard için
    words?: number;
    sentences?: number;
    minutes?: number;
  };
}

