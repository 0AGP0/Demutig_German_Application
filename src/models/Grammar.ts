export interface GrammarExample {
  de: string;
  tr: string;
}

export interface Grammar {
  topic: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  explanation_tr: string;
  examples: GrammarExample[];
  exercises?: Array<{
    question_tr: string;
    options_tr: string[];
    correct_index: number;
  }>;
}







