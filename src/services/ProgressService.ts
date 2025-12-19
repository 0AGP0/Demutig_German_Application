import { StorageService } from './StorageService';
import { DataService } from './DataService';
import { LessonService } from './LessonService';
import { UserProgress, LevelProgress } from '../models/Progress';

export class ProgressService {
  // Her seviye için toplam ders sayısını hesapla
  static async getLevelTargets(): Promise<Record<'A1' | 'A2' | 'B1' | 'B2', { lessons: number }>> {
    const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
    const targets: Record<'A1' | 'A2' | 'B1' | 'B2', { lessons: number }> = {
      A1: { lessons: 0 },
      A2: { lessons: 0 },
      B1: { lessons: 0 },
      B2: { lessons: 0 },
    };

    // Her seviye için toplam ders sayısını hesapla
    for (const level of allLevels) {
      const lessons = await LessonService.loadLessons(level);
      targets[level] = {
        lessons: lessons.length,
      };
    }

    return targets;
  }

  // İlerlemeyi hesapla - DERSLERE GÖRE
  static async calculateProgress(): Promise<UserProgress> {
    const savedProgress = await StorageService.getProgress();
    const knownVocab = await StorageService.getVocabulary();
    const practicedSentences = await StorageService.getSentences();
    
    // Her seviye için toplam ders sayısını al
    const levelTargets = await this.getLevelTargets();
    
    // Her seviye için tamamlanan ders sayısını hesapla
    const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
    const lessonsCompletedByLevel: Record<'A1' | 'A2' | 'B1' | 'B2', number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
    };
    
    // Her seviye için tamamlanan dersleri say
    for (const level of allLevels) {
      const lessons = await LessonService.loadLessons(level);
      const allProgress = await LessonService.getAllLessonProgress();
      
      let completedCount = 0;
      for (const lesson of lessons) {
        const progress = allProgress[lesson.lesson_id];
        if (progress?.completed === true) {
          completedCount++;
        }
      }
      
      lessonsCompletedByLevel[level] = completedCount;
    }
    
    // Seviye ilerlemelerini hesapla (derslere göre)
    const levelProgress: UserProgress['level_progress'] = {
      A1: this.calculateLevelProgress('A1', lessonsCompletedByLevel.A1, levelTargets.A1),
      A2: this.calculateLevelProgress('A2', lessonsCompletedByLevel.A2, levelTargets.A2),
      B1: this.calculateLevelProgress('B1', lessonsCompletedByLevel.B1, levelTargets.B1),
      B2: this.calculateLevelProgress('B2', lessonsCompletedByLevel.B2, levelTargets.B2),
    };
    
    // Mevcut seviyeyi belirle: En yüksek tamamlanma yüzdesine sahip seviye
    let currentLevel: 'A1' | 'A2' | 'B1' | 'B2' = 'A1';
    
    // Sırayla kontrol et: A1 tamamlanınca A2, A2 tamamlanınca B1, vs.
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
  
  // Seviye ilerlemesini hesapla - DERSLERE GÖRE
  static calculateLevelProgress(
    level: 'A1' | 'A2' | 'B1' | 'B2',
    lessonsCompleted: number,
    targets: { lessons: number }
  ): LevelProgress {
    // Derslere göre ilerleme: (Tamamlanan dersler / Toplam dersler) * 100
    const lessonProgress = targets.lessons > 0 ? lessonsCompleted / targets.lessons : 0;
    const percentage = Math.min(100, Math.round(lessonProgress * 100));
    
    // Vocabulary ve Sentences sayılarını da hesapla (gösterim için)
    // Ama ilerleme yüzdesi sadece derslere göre
    return {
      vocab_completed: lessonsCompleted, // Tamamlanan ders sayısı (gösterim için)
      vocab_target: targets.lessons, // Toplam ders sayısı (gösterim için)
      sentences_completed: lessonsCompleted, // Tamamlanan ders sayısı (gösterim için)
      sentences_target: targets.lessons, // Toplam ders sayısı (gösterim için)
      percentage: percentage, // Asıl ilerleme: derslere göre
    };
  }
  
  // Günlük ilerlemeyi güncelle
  static async updateDailyProgress(): Promise<void> {
    await this.calculateProgress();
    await StorageService.updateStreak();
  }
}








