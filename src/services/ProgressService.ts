import { StorageService } from './StorageService';
import { DataService } from './DataService';
import { UserProgress, LevelProgress } from '../models/Progress';

// Seviye hedefleri
const LEVEL_TARGETS = {
  A1: { vocab: 500, sentences: 0 },
  A2: { vocab: 1000, sentences: 0 },
  B1: { vocab: 1000, sentences: 3500 },
  B2: { vocab: 1000, sentences: 3500 },
};

export class ProgressService {
  // İlerlemeyi hesapla
  static async calculateProgress(): Promise<UserProgress> {
    const savedProgress = await StorageService.getProgress();
    const knownVocab = await StorageService.getVocabulary();
    const practicedSentences = await StorageService.getSentences();
    
    // Bilinen kelimeleri seviyeye göre say
    const vocabByLevel = {
      A1: knownVocab.filter(v => v.known && v.level === 'A1').length,
      A2: knownVocab.filter(v => v.known && v.level === 'A2').length,
      B1: knownVocab.filter(v => v.known && v.level === 'B1').length,
      B2: knownVocab.filter(v => v.known && v.level === 'B2').length,
    };
    
    // Pratik edilen cümleleri seviyeye göre say
    const sentencesByLevel = {
      A1: practicedSentences.filter(s => s.practiced && s.level === 'A1').length,
      A2: practicedSentences.filter(s => s.practiced && s.level === 'A2').length,
      B1: practicedSentences.filter(s => s.practiced && s.level === 'B1').length,
      B2: practicedSentences.filter(s => s.practiced && s.level === 'B2').length,
    };
    
    // Seviye ilerlemelerini hesapla
    const levelProgress: UserProgress['level_progress'] = {
      A1: this.calculateLevelProgress('A1', vocabByLevel.A1, sentencesByLevel.A1),
      A2: this.calculateLevelProgress('A2', vocabByLevel.A2, sentencesByLevel.A2),
      B1: this.calculateLevelProgress('B1', vocabByLevel.B1, sentencesByLevel.B1),
      B2: this.calculateLevelProgress('B2', vocabByLevel.B2, sentencesByLevel.B2),
    };
    
    // Mevcut seviyeyi belirle (%80 tamamlanan en yüksek seviye)
    let currentLevel: 'A1' | 'A2' | 'B1' | 'B2' = 'A1';
    if (levelProgress.B2.percentage >= 80) currentLevel = 'B2';
    else if (levelProgress.B1.percentage >= 80) currentLevel = 'B1';
    else if (levelProgress.A2.percentage >= 80) currentLevel = 'A2';
    else if (levelProgress.A1.percentage >= 80) currentLevel = 'A2';
    
    const progress: UserProgress = {
      total_words_learned: knownVocab.filter(v => v.known).length,
      total_sentences_practiced: practicedSentences.filter(s => s.practiced).length,
      total_readings_completed: 0,
      total_listening_completed: 0,
      streak_days: savedProgress?.streak_days || 0,
      last_study_date: savedProgress?.last_study_date || new Date().toISOString(),
      level_progress: levelProgress,
      current_level: currentLevel,
      daily_goal: savedProgress?.daily_goal || {
        cards: 20,
        reading_or_listening: 1,
        lessons: 1,
        words: 10,
        sentences: 5,
        minutes: 30,
      },
    };
    
    await StorageService.saveProgress(progress);
    return progress;
  }
  
  // Seviye ilerlemesini hesapla
  static calculateLevelProgress(
    level: 'A1' | 'A2' | 'B1' | 'B2',
    vocabCompleted: number,
    sentencesCompleted: number
  ): LevelProgress {
    const targets = LEVEL_TARGETS[level];
    
    const vocabProgress = vocabCompleted / targets.vocab;
    const sentenceProgress = targets.sentences > 0 
      ? sentencesCompleted / targets.sentences 
      : 1; // A1-A2 için cümle gerekmez
    
    // A1-A2: Sadece kelime
    // B1-B2: Kelime %50 + Cümle %50
    let overallProgress: number;
    if (level === 'A1' || level === 'A2') {
      overallProgress = vocabProgress;
    } else {
      overallProgress = (vocabProgress * 0.5) + (sentenceProgress * 0.5);
    }
    
    const percentage = Math.min(100, Math.round(overallProgress * 100));
    
    return {
      vocab_completed: vocabCompleted,
      vocab_target: targets.vocab,
      sentences_completed: sentencesCompleted,
      sentences_target: targets.sentences,
      grammar_completed: 0,
      grammar_target: 0,
      reading_completed: 0,
      reading_target: 0,
      listening_completed: 0,
      listening_target: 0,
      percentage: percentage,
    };
  }
  
  // Günlük ilerlemeyi güncelle
  static async updateDailyProgress(): Promise<void> {
    await this.calculateProgress();
    await StorageService.updateStreak();
  }
}







