import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { Reading } from '../models/Reading';
import { UserProgress } from '../models/Progress';

const STORAGE_KEYS = {
  VOCABULARY: '@german_app:vocabulary',
  SENTENCES: '@german_app:sentences',
  READINGS: '@german_app:readings',
  PROGRESS: '@german_app:progress',
  LAST_STUDY_DATE: '@german_app:last_study_date',
  STREAK_DAYS: '@german_app:streak_days',
  TEST_PROGRESS: '@german_app:test_progress',
};

// Cache mekanizması
let vocabularyCache: Vocabulary[] | null = null;
let sentencesCache: Sentence[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5000; // 5 saniye cache

export class StorageService {
  // Cache'i temizle
  static clearCache(): void {
    vocabularyCache = null;
    sentencesCache = null;
    cacheTimestamp = 0;
  }
  // Kelime durumunu güncelle (yeni format: id veya word ile)
  static async updateVocabularyStatus(identifier: string | number, known: boolean, wordData?: any): Promise<void> {
    try {
      const vocab = await this.getVocabulary();
      let index = vocab.findIndex(v => 
        (typeof identifier === 'number' && v.id === identifier) ||
        (typeof identifier === 'string' && (v.word === identifier || v.german === identifier))
      );
      
      // Eğer kelime bulunamadıysa ve wordData varsa, yeni kelime ekle
      if (index === -1 && wordData) {
        const newWord: any = {
          ...wordData,
          known: known,
          last_reviewed: new Date().toISOString(),
          review_count: 1,
          correct_count: known ? 1 : 0,
          wrong_count: known ? 0 : 1,
          daily_reviewed_date: new Date().toISOString(),
        };
        if (known) {
          newWord.learned_date = new Date().toISOString();
        }
        vocab.push(newWord);
        index = vocab.length - 1;
      }
      
      if (index !== -1) {
        const now = new Date().toISOString();
        const today = new Date().toDateString();
        vocab[index].known = known;
        vocab[index].last_reviewed = now;
        vocab[index].review_count = (vocab[index].review_count || 0) + 1;
        
        // İlk öğrenme tarihi (sadece known: true olduğunda)
        if (known && !vocab[index].learned_date) {
          vocab[index].learned_date = now;
        }
        
        // Bugün değerlendirilen kelimeleri takip et (Dashboard için)
        // Her değerlendirmede daily_reviewed_date'i bugün olarak güncelle
        const lastDailyReview = vocab[index].daily_reviewed_date 
          ? new Date(vocab[index].daily_reviewed_date as string).toDateString() 
          : null;
        
        // Eğer bugün değerlendirilmemişse veya hiç değerlendirilmemişse, bugün set et
        if (!lastDailyReview || lastDailyReview !== today) {
          vocab[index].daily_reviewed_date = now;
        }
        
        // Doğru/yanlış sayısını güncelle
        if (known) {
          vocab[index].correct_count = (vocab[index].correct_count || 0) + 1;
        } else {
          vocab[index].wrong_count = (vocab[index].wrong_count || 0) + 1;
        }
        
        // Zorluk seviyesini hesapla (yanlış sayısına göre)
        const wrongCount = vocab[index].wrong_count || 0;
        const correctCount = vocab[index].correct_count || 0;
        const totalAttempts = wrongCount + correctCount;
        
        if (totalAttempts > 0) {
          // Yanlış oranına göre zorluk (1-5 arası)
          const wrongRatio = wrongCount / totalAttempts;
          vocab[index].difficulty_level = Math.min(5, Math.max(1, Math.ceil(wrongRatio * 5)));
        }
        
        // Spaced repetition: Bir sonraki tekrar tarihini hesapla
        if (known) {
          // Doğru cevap: Daha uzun süre sonra tekrar et
          const daysToAdd = Math.min(30, Math.pow(2, vocab[index].review_count || 1)); // 2, 4, 8, 16, 30 gün
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + daysToAdd);
          vocab[index].next_review_date = nextReview.toISOString();
        } else {
          // Yanlış cevap: Daha kısa süre sonra tekrar et
          const daysToAdd = 1; // 1 gün sonra
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + daysToAdd);
          vocab[index].next_review_date = nextReview.toISOString();
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(vocab));
        this.clearCache(); // Cache'i temizle
      }
    } catch (error) {
      console.error('Error updating vocabulary:', error);
    }
  }

  // Test sonucunu kaydet - SADECE known/unknown takibi
  // testMode: 'known' = Biliyorum modu, 'unknown' = Bilmiyorum modu
  static async recordTestResult(identifier: string | number, isCorrect: boolean, wordData?: any, testMode: 'known' | 'unknown' | 'review' = 'unknown'): Promise<void> {
    try {
      const vocab = await this.getVocabulary();
      let index = vocab.findIndex(v => 
        (typeof identifier === 'number' && v.id === identifier) ||
        (typeof identifier === 'string' && (v.word === identifier || v.german === identifier))
      );
      
      // Eğer kelime bulunamadıysa ve wordData varsa, yeni kelime ekle
      if (index === -1 && wordData) {
        const newWord: any = {
          ...wordData,
          known: testMode === 'unknown' && isCorrect, // Bilmiyorum modunda doğru cevap → known: true
          last_reviewed: new Date().toISOString(),
          review_count: 1,
          daily_reviewed_date: new Date().toISOString(),
        };
        if (testMode === 'unknown' && isCorrect) {
          newWord.learned_date = new Date().toISOString();
        }
        vocab.push(newWord);
        index = vocab.length - 1;
      }
      
      if (index !== -1) {
        const now = new Date().toISOString();
        vocab[index].last_reviewed = now;
        vocab[index].review_count = (vocab[index].review_count || 0) + 1;
        
        // Test moduna göre known durumunu güncelle
        if (testMode === 'known') {
          // Biliyorum modu: Yanlış cevap → known: false (bilmiyoruma düş)
          if (!isCorrect) {
            vocab[index].known = false;
            vocab[index].learned_date = undefined; // Öğrenme tarihini kaldır
          }
          // Doğru cevap → known: true kalır (zaten biliyor)
          if (isCorrect && !vocab[index].known) {
            vocab[index].known = true;
            if (!vocab[index].learned_date) {
              vocab[index].learned_date = now;
            }
          }
        } else if (testMode === 'unknown') {
          // Bilmiyorum modu: Doğru cevap → known: true (öğrenildi)
          if (isCorrect) {
            vocab[index].known = true;
            if (!vocab[index].learned_date) {
              vocab[index].learned_date = now;
            }
          }
          // Yanlış cevap → known: false kalır
        }
        // Review modu: known durumunu değiştirme, sadece tekrar et
        
        // Spaced repetition
        if (isCorrect) {
          const daysToAdd = Math.min(30, Math.pow(2, vocab[index].review_count || 1));
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + daysToAdd);
          vocab[index].next_review_date = nextReview.toISOString();
        } else {
          const daysToAdd = 1;
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + daysToAdd);
          vocab[index].next_review_date = nextReview.toISOString();
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(vocab));
        this.clearCache(); // Cache'i temizle
      }
    } catch (error) {
      console.error('Error recording test result:', error);
    }
  }

  // Kelimeleri getir
  static async getVocabulary(useCache: boolean = true): Promise<Vocabulary[]> {
    // Cache kontrolü
    if (useCache && vocabularyCache && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return vocabularyCache;
    }
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VOCABULARY);
      const result = data ? JSON.parse(data) : [];
      vocabularyCache = result;
      cacheTimestamp = Date.now();
      return result;
    } catch (error) {
      console.error('Error getting vocabulary:', error);
      return [];
    }
  }

  // Cümle pratiğini kaydet (practiced: true/false)
  static async markSentencePracticed(sentenceId: number, practiced: boolean = true, sentenceData?: any): Promise<void> {
    try {
      const sentences = await this.getSentences();
      const index = sentences.findIndex(s => s.id === sentenceId);
      const now = new Date().toISOString();
      const today = new Date().toDateString();
      
      if (index !== -1) {
        // Mevcut cümleyi güncelle
        sentences[index].practiced = practiced;
        sentences[index].practiced_date = now;
        
        // Review count güncelle
        sentences[index].review_count = (sentences[index].review_count || 0) + 1;
        
        // Spaced repetition: Bir sonraki tekrar tarihini hesapla
        if (practiced) {
          // Okudum/Bildim: Daha uzun süre sonra tekrar et
          const daysToAdd = Math.min(30, Math.pow(2, sentences[index].review_count || 1)); // 2, 4, 8, 16, 30 gün
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + daysToAdd);
          sentences[index].next_review_date = nextReview.toISOString();
        } else {
          // Okumadım/Bilmediğim: Daha kısa süre sonra tekrar et
          const daysToAdd = 1; // 1 gün sonra
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + daysToAdd);
          sentences[index].next_review_date = nextReview.toISOString();
        }
        
        // daily_reviewed_date güncelle (Dashboard için)
        const lastDailyReview = sentences[index].daily_reviewed_date 
          ? new Date(sentences[index].daily_reviewed_date as string).toDateString() 
          : null;
        
        if (!lastDailyReview || lastDailyReview !== today) {
          sentences[index].daily_reviewed_date = now;
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
        this.clearCache(); // Cache'i temizle
      } else {
        // Yeni cümle ekle
        // sentenceData içindeki practiced değerini override etmemek için önce spread, sonra practiced set et
        const reviewCount = 1;
        const nextReview = new Date();
        
        // Spaced repetition: Bir sonraki tekrar tarihini hesapla
        if (practiced) {
          // Okudum/Bildim: Daha uzun süre sonra tekrar et
          const daysToAdd = Math.min(30, Math.pow(2, reviewCount)); // 2 gün
          nextReview.setDate(nextReview.getDate() + daysToAdd);
        } else {
          // Okumadım/Bilmediğim: Daha kısa süre sonra tekrar et
          nextReview.setDate(nextReview.getDate() + 1); // 1 gün sonra
        }
        
        const newSentence: any = {
          ...sentenceData,
          id: sentenceId,
          practiced: practiced, // Bu değer sentenceData'daki practiced değerini override eder
          practiced_date: now,
          daily_reviewed_date: now,
          review_count: reviewCount,
          next_review_date: nextReview.toISOString(),
        };
        sentences.push(newSentence);
        await AsyncStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
        this.clearCache(); // Cache'i temizle
      }
    } catch (error) {
      console.error('Error marking sentence practiced:', error);
    }
  }

  // Cümleleri getir
  static async getSentences(useCache: boolean = true): Promise<Sentence[]> {
    // Cache kontrolü
    if (useCache && sentencesCache && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return sentencesCache;
    }
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SENTENCES);
      const result = data ? JSON.parse(data) : [];
      sentencesCache = result;
      cacheTimestamp = Date.now();
      return result;
    } catch (error) {
      console.error('Error getting sentences:', error);
      return [];
    }
  }

  // Cümle test sonucunu kaydet
  static async recordSentenceTestResult(sentenceId: number, isCorrect: boolean, sentenceData?: any, testMode: 'known' | 'unknown' | 'review' = 'unknown'): Promise<void> {
    try {
      const sentences = await this.getSentences();
      let index = sentences.findIndex(s => s.id === sentenceId);
      
      // Eğer cümle bulunamadıysa ve sentenceData varsa, yeni cümle ekle
      if (index === -1 && sentenceData) {
        const now = new Date();
        const reviewCount = 1;
        const nextReview = new Date();
        
        // Spaced repetition: Bir sonraki tekrar tarihini hesapla
        const practiced = testMode === 'unknown' && isCorrect; // Bilmiyorum modunda doğru cevap → practiced: true
        if (isCorrect) {
          const daysToAdd = Math.min(30, Math.pow(2, reviewCount)); // 2 gün
          nextReview.setDate(nextReview.getDate() + daysToAdd);
        } else {
          nextReview.setDate(nextReview.getDate() + 1); // 1 gün sonra
        }
        
        const newSentence: any = {
          ...sentenceData,
          practiced: practiced,
          practiced_date: now.toISOString(),
          daily_reviewed_date: now.toISOString(),
          review_count: reviewCount,
          next_review_date: nextReview.toISOString(),
        };
        sentences.push(newSentence);
        index = sentences.length - 1;
      }
      
      if (index !== -1) {
        const now = new Date().toISOString();
        const currentPracticed = sentences[index].practiced || false;
        sentences[index].practiced_date = now;
        
        // Review count güncelle
        sentences[index].review_count = (sentences[index].review_count || 0) + 1;
        
        // Test moduna göre practiced durumunu güncelle
        if (testMode === 'known') {
          // Biliyorum modu: Yanlış cevap → practiced: false (okumadıma düş)
          if (!isCorrect) {
            sentences[index].practiced = false;
          }
          // Doğru cevap → practiced: true kalır (zaten okumuş)
          if (isCorrect && !sentences[index].practiced) {
            sentences[index].practiced = true;
          }
        } else if (testMode === 'unknown') {
          // Bilmiyorum modu: Sadece doğru cevap verilirse practiced: true yap
          // Yanlış cevap verilirse mevcut durumu koru (practiced: true ise true kalır, false ise false kalır)
          if (isCorrect) {
            sentences[index].practiced = true;
          } else {
            // Yanlış cevap → mevcut durumu koru (hiçbir şey değiştirme)
            // currentPracticed zaten yukarıda kaydedildi, ama yine de açıkça koruyalım
            sentences[index].practiced = currentPracticed;
          }
        }
        // Review modu: practiced durumunu değiştirme, sadece tekrar et
        
        // Spaced repetition: Bir sonraki tekrar tarihini hesapla
        const reviewCount = sentences[index].review_count || 1;
        const nextReview = new Date();
        
        if (isCorrect) {
          // Doğru cevap: Daha uzun süre sonra tekrar et
          const daysToAdd = Math.min(30, Math.pow(2, reviewCount)); // 2, 4, 8, 16, 30 gün
          nextReview.setDate(nextReview.getDate() + daysToAdd);
        } else {
          // Yanlış cevap: Daha kısa süre sonra tekrar et
          nextReview.setDate(nextReview.getDate() + 1); // 1 gün sonra
        }
        sentences[index].next_review_date = nextReview.toISOString();
        
        // daily_reviewed_date güncelle (Dashboard için)
        const today = new Date().toDateString();
        const lastDailyReview = sentences[index].daily_reviewed_date 
          ? new Date(sentences[index].daily_reviewed_date as string).toDateString() 
          : null;
        
        if (!lastDailyReview || lastDailyReview !== today) {
          sentences[index].daily_reviewed_date = now;
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
        this.clearCache(); // Cache'i temizle
      }
    } catch (error) {
      console.error('Error recording sentence test result:', error);
    }
  }

  // Okuma ilerlemesini kaydet
  static async saveReadingProgress(reading: Reading): Promise<void> {
    try {
      const readings = await this.getReadings();
      const index = readings.findIndex(r => r.id === reading.id);
      if (index !== -1) {
        readings[index] = reading;
      } else {
        readings.push(reading);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.READINGS, JSON.stringify(readings));
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  }

  // Okumaları getir
  static async getReadings(): Promise<Reading[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.READINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting readings:', error);
      return [];
    }
  }

  // İlerlemeyi kaydet
  static async saveProgress(progress: UserProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  // İlerlemeyi getir
  static async getProgress(): Promise<UserProgress | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting progress:', error);
      return null;
    }
  }

  // Streak güncelle
  static async updateStreak(): Promise<number> {
    try {
      const lastDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_STUDY_DATE);
      const today = new Date().toDateString();
      const currentStreak = parseInt(await AsyncStorage.getItem(STORAGE_KEYS.STREAK_DAYS) || '0');

      if (lastDate !== today) {
        const lastDateObj = lastDate ? new Date(lastDate) : null;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (!lastDateObj || lastDateObj.toDateString() === yesterday.toDateString()) {
          // Devam eden streak
          const newStreak = currentStreak + 1;
          await AsyncStorage.setItem(STORAGE_KEYS.STREAK_DAYS, newStreak.toString());
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_STUDY_DATE, today);
          return newStreak;
        } else {
          // Streak kırıldı, sıfırla
          await AsyncStorage.setItem(STORAGE_KEYS.STREAK_DAYS, '1');
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_STUDY_DATE, today);
          return 1;
        }
      }

      return currentStreak;
    } catch (error) {
      console.error('Error updating streak:', error);
      return 0;
    }
  }

  // Test ilerlemesini kaydet
  static async saveTestProgress(
    contentType: 'words' | 'sentences',
    testMode: 'known' | 'unknown' | 'review' | 'mixed',
    level: 'A1' | 'A2' | 'B1' | 'B2',
    currentIndex: number
  ): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.TEST_PROGRESS}_${contentType}_${testMode}_${level}`;
      await AsyncStorage.setItem(key, JSON.stringify({ currentIndex }));
    } catch (error) {
      console.error('Error saving test progress:', error);
    }
  }

  // Test ilerlemesini yükle
  static async loadTestProgress(
    contentType: 'words' | 'sentences',
    testMode: 'known' | 'unknown' | 'review' | 'mixed',
    level: 'A1' | 'A2' | 'B1' | 'B2'
  ): Promise<number | null> {
    try {
      const key = `${STORAGE_KEYS.TEST_PROGRESS}_${contentType}_${testMode}_${level}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const progress = JSON.parse(data);
        return progress.currentIndex || null;
      }
      return null;
    } catch (error) {
      console.error('Error loading test progress:', error);
      return null;
    }
  }

  // Test ilerlemesini sıfırla (test bittiğinde veya yeni test başladığında)
  static async clearTestProgress(
    contentType: 'words' | 'sentences',
    testMode: 'known' | 'unknown' | 'review' | 'mixed',
    level: 'A1' | 'A2' | 'B1' | 'B2'
  ): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.TEST_PROGRESS}_${contentType}_${testMode}_${level}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing test progress:', error);
    }
  }

  // Tüm verileri sıfırla (geliştirme için)
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.VOCABULARY,
        STORAGE_KEYS.SENTENCES,
        STORAGE_KEYS.READINGS,
        STORAGE_KEYS.PROGRESS,
        STORAGE_KEYS.LAST_STUDY_DATE,
        STORAGE_KEYS.STREAK_DAYS,
        STORAGE_KEYS.TEST_PROGRESS,
      ]);
      console.log('All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

