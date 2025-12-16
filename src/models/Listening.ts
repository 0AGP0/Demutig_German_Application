export interface Listening {
  id: number;
  level: 'B1' | 'B2';
  title: string;
  transcript_de: string;
  transcript_tr: string;
  audio_url?: string | null;
  completed?: boolean;
}







