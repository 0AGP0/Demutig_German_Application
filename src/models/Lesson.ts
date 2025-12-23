export interface Lesson {
  lesson_id: string; // A1_L01 gibi
  level: 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  grammar: string[];
  vocab_ids: number[];
  sentence_ids: number[];
  tests: LessonTest[];
}

export interface LessonTest {
  type: 'recall_word' | 'cloze_sentence' | 'sentence_recall' | 'listening_comprehension' | 'usage_choice';
  count: number;
}

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  grammar_read: boolean;
  started_at?: string;
  completed_at?: string;
  vocab_mastered_count: number;
  sentence_mastered_count: number;
  current_card_index?: number;
}

export interface LessonData {
  book_id: string;
  part: string;
  version: string;
  source_sets: {
    vocab: string;
    sentences: string;
  };
  rules: {
    lesson_vocab_count: number;
    lesson_sentence_count: number;
    mastery: {
      word_mastered_knownCount: number;
      sentence_mastered_knownCount: number;
    };
  };
  lessons: Lesson[];
}












