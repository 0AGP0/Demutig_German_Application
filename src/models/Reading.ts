export interface ReadingQuestion {
  question_tr: string;
  options_tr: string[];
  correct_index: number;
}

export interface Reading {
  id: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  text_de: string;
  text_tr: string;
  questions: ReadingQuestion[];
  completed?: boolean;
}







