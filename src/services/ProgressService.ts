import { StorageService } from './StorageService';
import { DataService } from './DataService';
import { UserProgress, LevelProgress } from '../models/Progress';

// Seviye hedefleri (Mastered sayısı)
const LEVEL_TARGETS = {
  A1: { vocab: 1000, sentences: 500 },
  A2: { vocab: 1000, sentences: 500 },
  B1: { vocab: 1000, sentences: 3500 },
  B2: { vocab: 1000, sentences: 3500 },
};

export class ProgressService {
  // İlerlemeyi hesapla
  static async calculateProgress(): Promise<UserProgress> {
    const savedProgress = await StorageService.getProgress();
    const knownVocab = await StorageService.getVocabulary();
    const practicedSentences = await StorageService.getSentences();
    
    // Mastered kelimeleri seviyeye göre say (status === 'mastered' veya knownCount >= 2)
    const vocabByLevel = {
      A1: knownVocab.filter(v => (v.status === 'mastered' || (v.knownCount && v.knownCount >= 2)) && v.level === 'A1').length,
      A2: knownVocab.filter(v => (v.status === 'mastered' || (v.knownCount && v.knownCount >= 2)) && v.level === 'A2').length,
      B1: knownVocab.filter(v => (v.status === 'mastered' || (v.knownCount && v.knownCount >= 2)) && v.level === 'B1').length,
      B2: knownVocab.filter(v => (v.status === 'mastered' || (v.knownCount && v.knownCount >= 2)) && v.level === 'B2').length,
    };
    
    // Mastered cümleleri seviyeye göre say (status === 'mastered' veya practicedCount >= 2)
    const sentencesByLevel = {
      A1: practicedSentences.filter(s => (s.status === 'mastered' || (s.practicedCount && s.practicedCount >= 2)) && s.level === 'A1').length,
      A2: practicedSentences.filter(s => (s.status === 'mastered' || (s.practicedCount && s.practicedCount >= 2)) && s.level === 'A2').length,
      B1: practicedSentences.filter(s => (s.status === 'mastered' || (s.practicedCount && s.practicedCount >= 2)) && s.level === 'B1').length,
      B2: practicedSentences.filter(s => (s.status === 'mastered' || (s.practicedCount && s.practicedCount >= 2)) && s.level === 'B2').length,
    };
    
    // Seviye ilerlemelerini hesapla
    const levelProgress: UserProgress['level_progress'] = {
      A1: this.calculateLevelProgress('A1', vocabByLevel.A1, sentencesByLevel.A1),
      A2: this.calculateLevelProgress('A2', vocabByLevel.A2, sentencesByLevel.A2),
      B1: this.calculateLevelProgress('B1', vocabByLevel.B1, sentencesByLevel.B1),
      B2: this.calculateLevelProgress('B2', vocabByLevel.B2, sentencesByLevel.B2),
    };
    
    // Mevcut seviyeyi belirle: A1 tamamlanınca A2 açılır (100% şart)
    let currentLevel: 'A1' | 'A2' | 'B1' | 'B2' = 'A1';
    if (levelProgress.A1.percentage >= 100) {
      // A1 tamamlandı, A2'ye geç
      if (levelProgress.B2.percentage >= 100) currentLevel = 'B2';
      else if (levelProgress.B1.percentage >= 100) currentLevel = 'B1';
      else if (levelProgress.A2.percentage >= 100) currentLevel = 'A2';
      else currentLevel = 'A2'; // A1 tamamlandı, A2'ye geç
    }
    
    const progress: UserProgress = {
      total_words_learned: knownVocab.filter(v => v.status === 'mastered' || (v.knownCount && v.knownCount >= 2)).length,
      total_sentences_practiced: practicedSentences.filter(s => s.status === 'mastered' || (s.practicedCount && s.practicedCount >= 2)).length,
      streak_days: savedProgress?.streak_days || 0,
      last_study_date: savedProgress?.last_study_date || new Date().toISOString(),
      level_progress: levelProgress,
      current_level: currentLevel,
      daily_goal: savedProgress?.daily_goal || {
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
      : 0;
    
    // A1: Kelime %70 + Cümle %30
    // A2: Kelime %70 + Cümle %30
    // B1-B2: Kelime %50 + Cümle %50
    let overallProgress: number;
    if (level === 'A1' || level === 'A2') {
      overallProgress = (vocabProgress * 0.7) + (sentenceProgress * 0.3);
    } else {
      overallProgress = (vocabProgress * 0.5) + (sentenceProgress * 0.5);
    }
    
    const percentage = Math.min(100, Math.round(overallProgress * 100));
    
    return {
      vocab_completed: vocabCompleted,
      vocab_target: targets.vocab,
      sentences_completed: sentencesCompleted,
      sentences_target: targets.sentences,
      percentage: percentage,
    };
  }
  
  // Günlük ilerlemeyi güncelle
  static async updateDailyProgress(): Promise<void> {
    await this.calculateProgress();
    await StorageService.updateStreak();
  }
}








