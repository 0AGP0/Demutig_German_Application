import { StorageService } from './StorageService';
import { DataService } from './DataService';
import { UserProgress, LevelProgress } from '../models/Progress';

export class ProgressService {
  // Her seviye için toplam kelime sayısını hesapla
  static async getLevelTargets(): Promise<Record<'A1' | 'A2' | 'B1' | 'B2', { vocab: number }>> {
    const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
    const targets: Record<'A1' | 'A2' | 'B1' | 'B2', { vocab: number }> = {
      A1: { vocab: 0 },
      A2: { vocab: 0 },
      B1: { vocab: 0 },
      B2: { vocab: 0 },
    };

    try {
      // Her seviye için toplam kelime sayısını hesapla
    for (const level of allLevels) {
        try {
          const words = await DataService.loadVocabulary(level);
      targets[level] = {
            vocab: Array.isArray(words) ? words.length : 0,
      };
        } catch (levelError) {
          console.error(`Error loading vocabulary for ${level}:`, levelError);
          targets[level] = { vocab: 0 };
        }
      }
    } catch (error) {
      console.error('Error in getLevelTargets:', error);
    }

    return targets;
  }

  // İlerlemeyi hesapla - KELİME KARTLARINA GÖRE
  static async calculateProgress(): Promise<UserProgress> {
    try {
      let savedProgress;
      let userVocab: any[] = [];
      let practicedSentences: any[] = [];
      
      try {
        savedProgress = await StorageService.getProgress();
      } catch (error) {
        console.error('Error loading saved progress:', error);
        savedProgress = null;
      }
      
      try {
        userVocab = await StorageService.getVocabulary();
        if (!Array.isArray(userVocab)) userVocab = [];
      } catch (error) {
        console.error('Error loading vocabulary:', error);
        userVocab = [];
      }
      
      try {
        practicedSentences = await StorageService.getSentences();
        if (!Array.isArray(practicedSentences)) practicedSentences = [];
      } catch (error) {
        console.error('Error loading sentences:', error);
        practicedSentences = [];
      }
    
      // Her seviye için toplam kelime sayısını al
      let levelTargets;
      try {
        levelTargets = await this.getLevelTargets();
      } catch (error) {
        console.error('Error getting level targets:', error);
        levelTargets = {
          A1: { vocab: 0 },
          A2: { vocab: 0 },
          B1: { vocab: 0 },
          B2: { vocab: 0 },
        };
      }
    
      // Her seviye için master edilen (3 kez bilinen) kelimeleri say
    const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
      const masteredByLevel: Record<'A1' | 'A2' | 'B1' | 'B2', number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
    };
    
      // Her seviye için master edilen kelimeleri say
      // Master: knownCount >= 3
      for (const word of userVocab) {
        if (!word || !word.level) continue;
        
        const level = word.level as 'A1' | 'A2' | 'B1' | 'B2';
        if (!allLevels.includes(level)) continue;
        
        // 3 kez biliniyor mu?
        const knownCount = word.knownCount || 0;
        if (knownCount >= 3) {
          masteredByLevel[level]++;
        }
    }
    
      // Seviye ilerlemelerini hesapla (kelimelere göre)
    const levelProgress: UserProgress['level_progress'] = {
        A1: this.calculateLevelProgress('A1', masteredByLevel.A1, levelTargets.A1),
        A2: this.calculateLevelProgress('A2', masteredByLevel.A2, levelTargets.A2),
        B1: this.calculateLevelProgress('B1', masteredByLevel.B1, levelTargets.B1),
        B2: this.calculateLevelProgress('B2', masteredByLevel.B2, levelTargets.B2),
    };
    
      // Mevcut seviyeyi belirle: İlk tamamlanmayan seviye
    let currentLevel: 'A1' | 'A2' | 'B1' | 'B2' = 'A1';
    
    if (levelProgress.A1.percentage >= 100) {
      if (levelProgress.A2.percentage >= 100) {
        if (levelProgress.B1.percentage >= 100) {
          if (levelProgress.B2.percentage >= 100) {
            currentLevel = 'B2'; // Tüm seviyeler tamamlandı
          } else {
            currentLevel = 'B2'; // B1 tamamlandı, B2'ye geç
          }
        } else {
          currentLevel = 'B1'; // A2 tamamlandı, B1'e geç
        }
      } else {
        currentLevel = 'A2'; // A1 tamamlandı, A2'ye geç
      }
    } else {
      currentLevel = 'A1'; // A1 devam ediyor
    }
    
      // Toplam öğrenilen kelime: knownCount >= 3 olanlar
      const totalMastered = userVocab.filter(v => v && (v.knownCount || 0) >= 3).length;
      
      // Toplam pratik yapılan cümle: practicedCount >= 2 olanlar
      const totalSentences = practicedSentences.filter(s => s && (s.practicedCount || 0) >= 2).length;
    
    const progress: UserProgress = {
        total_words_learned: totalMastered,
        total_sentences_practiced: totalSentences,
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
    
      try {
    await StorageService.saveProgress(progress);
      } catch (saveError) {
        console.error('Error saving progress:', saveError);
      }
      
    return progress;
    } catch (error) {
      console.error('Critical error in calculateProgress:', error);
      // Hata durumunda varsayılan progress döndür
      return {
        total_words_learned: 0,
        total_sentences_practiced: 0,
        streak_days: 0,
        last_study_date: new Date().toISOString(),
        level_progress: {
          A1: { vocab_completed: 0, vocab_target: 0, sentences_completed: 0, sentences_target: 0, percentage: 0 },
          A2: { vocab_completed: 0, vocab_target: 0, sentences_completed: 0, sentences_target: 0, percentage: 0 },
          B1: { vocab_completed: 0, vocab_target: 0, sentences_completed: 0, sentences_target: 0, percentage: 0 },
          B2: { vocab_completed: 0, vocab_target: 0, sentences_completed: 0, sentences_target: 0, percentage: 0 },
        },
        current_level: 'A1',
        daily_goal: { words: 10, sentences: 5, minutes: 30 },
      };
    }
  }
  
  // Seviye ilerlemesini hesapla - KELİMELERE GÖRE
  static calculateLevelProgress(
    level: 'A1' | 'A2' | 'B1' | 'B2',
    masteredCount: number,
    targets: { vocab: number }
  ): LevelProgress {
    // Kelimelere göre ilerleme: (3 kez bilinen kelimeler / Toplam kelimeler) * 100
    const vocabProgress = targets.vocab > 0 ? masteredCount / targets.vocab : 0;
    const percentage = Math.min(100, Math.round(vocabProgress * 100));
    
    return {
      vocab_completed: masteredCount, // 3 kez bilinen kelime sayısı
      vocab_target: targets.vocab, // Toplam kelime sayısı
      sentences_completed: masteredCount, // Gösterim için
      sentences_target: targets.vocab, // Gösterim için
      percentage: percentage, // Asıl ilerleme: 3 kez bilinen / toplam
    };
  }
  
  // Günlük ilerlemeyi güncelle
  static async updateDailyProgress(): Promise<void> {
    await this.calculateProgress();
    await StorageService.updateStreak();
  }
}
