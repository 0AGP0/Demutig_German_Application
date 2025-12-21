import { Lesson, LessonData, LessonProgress } from '../models/Lesson';
import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { StorageService } from './StorageService';
import { DataService } from './DataService';

export class LessonService {
  // Dersleri yükle
  static async loadLessons(level: 'A1' | 'A2' | 'B1' | 'B2'): Promise<Lesson[]> {
    try {
      let lessons: Lesson[] = [];
      
      try {
      switch (level) {
        case 'A1':
          lessons = require('../../assets/data/lessons_a1.json');
          break;
        case 'A2':
          lessons = require('../../assets/data/lessons_a2.json');
          break;
        case 'B1':
          lessons = require('../../assets/data/lessons_b1.json');
          break;
        case 'B2':
          lessons = require('../../assets/data/lessons_b2.json');
          break;
        default:
          lessons = [];
        }
      } catch (requireError) {
        console.error(`Error requiring lessons file for ${level}:`, requireError);
        return [];
      }
      
      // Eğer lessons bir array değilse (eski format), lessonData.lessons'ı kontrol et
      if (!Array.isArray(lessons)) {
        try {
        const lessonData = lessons as any;
          lessons = Array.isArray(lessonData.lessons) ? lessonData.lessons : [];
        } catch (parseError) {
          console.error(`Error parsing lessons data for ${level}:`, parseError);
          return [];
        }
      }
      
      // Güvenlik kontrolü: lessons'in array olduğundan emin ol
      if (!Array.isArray(lessons)) {
        console.error(`Lessons data for ${level} is not an array`);
        return [];
      }
      
      return lessons;
    } catch (error) {
      console.error(`Error loading lessons for ${level}:`, error);
      return [];
    }
  }

  // Ders progress'ini al
  static async getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
    return await StorageService.getLessonProgressById(lessonId);
  }

  // Tüm ders progress'lerini al
  static async getAllLessonProgress(): Promise<Record<string, LessonProgress>> {
    // Cache bypass - her zaman güncel verileri al
    return await StorageService.getLessonProgress(false);
  }

  // Ders kilit durumunu kontrol et
  static async isLessonLocked(lessonId: string, allLessons: Lesson[]): Promise<boolean> {
    // A1_L01 her zaman açık
    if (lessonId === 'A1_L01') {
      return false;
    }

    // Ders sırasını bul
    const lessonIndex = allLessons.findIndex(l => l.lesson_id === lessonId);
    if (lessonIndex === -1) {
      console.log(`⚠️ Lesson ${lessonId} not found in allLessons`);
      return true;
    }
    if (lessonIndex === 0) return false; // İlk ders açık

    // Önceki ders tamamlanmış mı?
    const previousLesson = allLessons[lessonIndex - 1];
    // Cache bypass - her zaman güncel verileri al
    const previousProgress = await StorageService.getLessonProgressById(previousLesson.lesson_id);
    
    console.log(`🔒 Checking lock for ${lessonId}: Previous lesson ${previousLesson.lesson_id} completed: ${previousProgress?.completed}`);
    console.log(`🔒 Previous progress details:`, previousProgress);
    
    if (!previousProgress || previousProgress.completed !== true) {
      console.log(`🔒 ${lessonId} is LOCKED - previous lesson not completed`);
      return true; // Önceki ders tamamlanmamış, kilitli
    }
    
    console.log(`🔒 ${lessonId} is UNLOCKED - previous lesson completed`);

    // Seviye kilidi kontrolü
    const currentLevel = lessonId.split('_')[0];
    const previousLevel = previousLesson.lesson_id.split('_')[0];
    
    if (currentLevel !== previousLevel) {
      // Farklı seviyeye geçiliyor, önceki seviyenin tüm dersleri tamamlanmış olmalı
      const previousLevelLessons = allLessons.filter(l => l.lesson_id.startsWith(previousLevel + '_'));
      
      // Promise.all ile kontrol et
      const progressChecks = await Promise.all(
        previousLevelLessons.map(l => this.getLessonProgress(l.lesson_id))
      );
      const allPreviousCompleted = progressChecks.every(p => p?.completed === true);
      
      console.log(`🔒 Level transition check: ${previousLevel} -> ${currentLevel}, all completed: ${allPreviousCompleted}`);
      
      return !allPreviousCompleted;
    }

    return false; // Açık
  }

  // Ders durumunu hesapla
  static async getLessonStatus(lessonId: string, allLessons: Lesson[]): Promise<'locked' | 'in_progress' | 'completed' | 'new'> {
    const isLocked = await this.isLessonLocked(lessonId, allLessons);
    if (isLocked) return 'locked';

    const progress = await this.getLessonProgress(lessonId);
    if (progress?.completed) return 'completed';
    if (progress?.grammar_read || progress?.started_at) return 'in_progress';
    
    return 'new';
  }

  // Ders için kelimeleri yükle
  static async loadLessonVocab(lesson: Lesson): Promise<Vocabulary[]> {
    const allVocab = await DataService.loadVocabulary();
    return allVocab.filter(v => lesson.vocab_ids.includes(v.id));
  }

  // Ders için cümleleri yükle
  static async loadLessonSentences(lesson: Lesson): Promise<Sentence[]> {
    const allSentences = await DataService.loadSentences(10000); // Yeterince büyük sayı
    return allSentences.filter(s => lesson.sentence_ids.includes(s.id));
  }

  // Ders tamamlanma kontrolü
  static async checkLessonCompletion(lessonId: string, lesson: Lesson): Promise<boolean> {
    const progress = await this.getLessonProgress(lessonId);
    console.log(`🔍 Checking completion for ${lessonId}: grammar_read=${progress?.grammar_read}`);
    
    if (!progress?.grammar_read) {
      console.log(`❌ ${lessonId}: Grammar not read yet`);
      return false;
    }

    // Kelimeleri kontrol et
    const vocab = await this.loadLessonVocab(lesson);
    // Cache'i bypass et - her zaman güncel verileri al
    const savedVocab = await StorageService.getVocabulary(false);
    const vocabMap = new Map(savedVocab.map(v => [v.id, v]));
    
    let vocabMasteredCount = 0;
    const allVocabMastered = vocab.every(v => {
      const saved = vocabMap.get(v.id);
      const isMastered = saved && (saved.status === 'mastered' || (saved.knownCount && saved.knownCount >= 2));
      if (isMastered) vocabMasteredCount++;
      return isMastered;
    });

    // Cümleleri kontrol et
    const sentences = await this.loadLessonSentences(lesson);
    // Cache'i bypass et - her zaman güncel verileri al
    const savedSentences = await StorageService.getSentences(false);
    // Map oluştur - hem number hem string key'ler için
    const sentenceMap = new Map<any, Sentence>();
    savedSentences.forEach(s => {
      const id = s.id;
      sentenceMap.set(id, s);
      if (typeof id === 'number') {
        sentenceMap.set(String(id), s);
      } else if (typeof id === 'string') {
        const numId = Number(id);
        if (!isNaN(numId)) {
          sentenceMap.set(numId, s);
        }
      }
    });
    
    console.log('🔍 Checking sentences:', sentences.length, 'saved sentences:', savedSentences.length);
    sentences.forEach(s => {
      const saved = sentenceMap.get(s.id);
      console.log('🔍 Sentence:', s.id, 'saved:', !!saved, 'status:', saved?.status, 'practicedCount:', saved?.practicedCount);
    });
    
    let sentenceMasteredCount = 0;
    const allSentencesMastered = sentences.every(s => {
      // ID eşleşmesi - hem number hem string karşılaştırması yap
      const sId = s.id;
      const saved = sentenceMap.get(sId) || 
                   (typeof sId === 'number' ? sentenceMap.get(String(sId)) : sentenceMap.get(Number(sId)));
      // Dersler için: practicedCount >= 1 yeterli (normal kartlarda >= 2)
      const isMastered = saved && (
        saved.status === 'mastered' || 
        (saved.practicedCount && saved.practicedCount >= 1) ||
        saved.practiced === true
      );
      if (isMastered) sentenceMasteredCount++;
      return isMastered;
    });

    console.log(`🔍 ${lessonId}: Vocab mastered: ${vocabMasteredCount}/${vocab.length}, Sentences mastered: ${sentenceMasteredCount}/${sentences.length}`);
    console.log(`🔍 ${lessonId}: All vocab mastered: ${allVocabMastered}, All sentences mastered: ${allSentencesMastered}`);

    const isCompleted = allVocabMastered && allSentencesMastered;
    if (isCompleted) {
      console.log(`✅ ${lessonId}: Lesson is completed!`);
    } else {
      console.log(`❌ ${lessonId}: Lesson not completed yet`);
    }

    return isCompleted;
  }

  // Ders tamamlandı olarak işaretle
  static async markLessonCompleted(lessonId: string): Promise<void> {
    await StorageService.markLessonCompleted(lessonId);
  }

  // Gramer okundu olarak işaretle
  static async markGrammarRead(lessonId: string): Promise<void> {
    await StorageService.markLessonGrammarRead(lessonId);
    
    // Eğer ders başlatılmamışsa başlat
    const progress = await this.getLessonProgress(lessonId);
    if (!progress?.started_at) {
      await StorageService.updateLessonProgress(lessonId, {
        started_at: new Date().toISOString(),
      });
    }
  }

}

