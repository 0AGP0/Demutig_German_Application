export interface DialogueLine {
  de: string;
  tr: string;
}

export interface Example {
  de: string;
  tr: string;
}

export interface Exercise {
  type: 'mcq' | 'fill' | 'translate';
  question_tr: string;
  options_tr?: string[];
  correct_index?: number;
  correct_answer?: string;
}

export interface Lesson {
  id: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  goal: string;
  grammar_focus: string;
  vocab_keys: string[];
  dialogue: DialogueLine[];
  examples: Example[];
  exercises: Exercise[];
  completed?: boolean;
}







