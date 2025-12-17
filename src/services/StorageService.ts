import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { UserProgress } from '../models/Progress';

const STORAGE_KEYS = {
  VOCABULARY: '@german_app:vocabulary',
  SENTENCES: '@german_app:sentences',
  PROGRESS: '@german_app:progress',
  LAST_STUDY_DATE: '@german_app:last_study_date',
  STREAK_DAYS: '@german_app:streak_days',
  TEST_PROGRESS: '@german_app:test_progress',
  TEST_FINISHED: '@german_app:test_finished',
  VOCABULARY_LAST_INDEX: '@german_app:vocabulary_last_index',
  SENTENCES_LAST_INDEX: '@german_app:sentences_last_index',
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
  // TestService ile aynı eşleşme mantığını kullan: id öncelikli, sonra german, sonra word
  static async updateVocabularyStatus(identifier: string | number, known: boolean, wordData?: any): Promise<void> {
    try {
      // Cache'i bypass et - her zaman güncel verileri al
      const vocab = await this.getVocabulary(false);
      let index = -1;
      
      // TestService ile aynı eşleşme mantığı: id öncelikli, sonra german, sonra word
      if (typeof identifier === 'number') {
        // Number ise id ile eşleştir
        index = vocab.findIndex(v => v.id === identifier);
      } else if (typeof identifier === 'string') {
        // String ise önce german ile, sonra word ile eşleştir
        index = vocab.findIndex(v => v.german === identifier || v.word === identifier);
      }
      
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
          knownCount: known ? 1 : 0,
          status: known ? 'learning' : 'new',
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
        
        // Mastered sistemi: knownCount takibi
        if (known) {
          // Sağa swipe (Biliyorum) → knownCount +1
          vocab[index].knownCount = (vocab[index].knownCount || 0) + 1;
          const currentKnownCount = vocab[index].knownCount || 0;
          if (currentKnownCount >= 2) {
            vocab[index].status = 'mastered';
            vocab[index].known = true;
          } else {
            vocab[index].status = 'learning';
          }
          // İlk öğrenme tarihi
          if (!vocab[index].learned_date) {
            vocab[index].learned_date = now;
          }
        } else {
          // Sola swipe (Bilmiyorum) → knownCount = 0
          vocab[index].knownCount = 0;
          const reviewCount = vocab[index].review_count || 0;
          if (reviewCount > 1) {
            vocab[index].status = 'learning'; // Daha önce görülmüş
          } else {
            vocab[index].status = 'new'; // İlk kez görülüyor
          }
          vocab[index].known = false;
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
        const currentKnownCount = vocab[index].knownCount || 0;
        
        if (known) {
          // Sağa swipe (Biliyorum)
          if (currentKnownCount >= 2) {
            // Mastered: 7 gün sonra tekrar et (pekiştirme)
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + 7);
            vocab[index].next_review_date = nextReview.toISOString();
            vocab[index].status = 'review'; // Tekrar zamanı gelince review olacak
          } else {
            // Learning: 1 gün sonra tekrar et (her "Biliyorum" 1 gün sonra)
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + 1);
            vocab[index].next_review_date = nextReview.toISOString();
            vocab[index].status = 'review'; // Tekrar zamanı gelince review olacak
          }
        } else {
          // Sola swipe (Bilmiyorum): 1 gün sonra tekrar et
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1);
          vocab[index].next_review_date = nextReview.toISOString();
          vocab[index].status = 'learning'; // Learning modunda, tekrar öğren
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
  // TestService ile aynı eşleşme mantığını kullan
  static async recordTestResult(identifier: string | number, isCorrect: boolean, wordData?: any, testMode: 'known' | 'unknown' | 'review' = 'unknown'): Promise<void> {
    try {
      // Cache'i bypass et - her zaman güncel verileri al
      const vocab = await this.getVocabulary(false);
      let index = -1;
      
      // TestService ile aynı eşleşme mantığı: id öncelikli, sonra german, sonra word
      if (typeof identifier === 'number') {
        index = vocab.findIndex(v => v.id === identifier);
      } else if (typeof identifier === 'string') {
        index = vocab.findIndex(v => v.german === identifier || v.word === identifier);
      }
      
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
        
        // Mastered sistemi: practicedCount takibi
        if (practiced) {
          // Sağa swipe (Okudum/Biliyorum) → practicedCount +1
          sentences[index].practicedCount = (sentences[index].practicedCount || 0) + 1;
          if (sentences[index].practicedCount >= 2) {
            sentences[index].status = 'mastered';
            sentences[index].practiced = true;
          } else {
            sentences[index].status = 'learning';
          }
        } else {
          // Sola swipe (Okumadım/Bilmediğim) → practicedCount = 0
          sentences[index].practicedCount = 0;
          if (sentences[index].review_count > 1) {
            sentences[index].status = 'learning'; // Daha önce görülmüş
          } else {
            sentences[index].status = 'new'; // İlk kez görülüyor
          }
          sentences[index].practiced = false;
        }
        
        // Spaced repetition: Bir sonraki tekrar tarihini hesapla
        const currentPracticedCount = sentences[index].practicedCount || 0;
        
        if (practiced) {
          // Sağa swipe (Okudum/Biliyorum)
          if (currentPracticedCount >= 2) {
            // Mastered: 7 gün sonra tekrar et (pekiştirme)
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + 7);
            sentences[index].next_review_date = nextReview.toISOString();
            sentences[index].status = 'review'; // Tekrar zamanı gelince review olacak
          } else {
            // Learning: 1 gün sonra tekrar et (her "Okudum" 1 gün sonra)
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + 1);
            sentences[index].next_review_date = nextReview.toISOString();
            sentences[index].status = 'review'; // Tekrar zamanı gelince review olacak
          }
        } else {
          // Sola swipe (Okumadım/Bilmediğim): 1 gün sonra tekrar et
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1);
          sentences[index].next_review_date = nextReview.toISOString();
          sentences[index].status = 'learning'; // Learning modunda, tekrar öğren
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
          practiced: practiced,
          practiced_date: now,
          daily_reviewed_date: now,
          review_count: reviewCount,
          next_review_date: nextReview.toISOString(),
          practicedCount: practiced ? 1 : 0,
          status: practiced ? 'learning' : 'new',
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

  // Test bitmiş durumunu kaydet
  static async saveTestFinished(
    contentType: 'words' | 'sentences',
    testMode: 'known' | 'unknown' | 'review' | 'mixed',
    level: 'A1' | 'A2' | 'B1' | 'B2',
    finished: boolean
  ): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.TEST_FINISHED}_${contentType}_${testMode}_${level}`;
      if (finished) {
        await AsyncStorage.setItem(key, 'true');
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error saving test finished:', error);
    }
  }

  // Test bitmiş durumunu yükle
  static async loadTestFinished(
    contentType: 'words' | 'sentences',
    testMode: 'known' | 'unknown' | 'review' | 'mixed',
    level: 'A1' | 'A2' | 'B1' | 'B2'
  ): Promise<boolean> {
    try {
      const key = `${STORAGE_KEYS.TEST_FINISHED}_${contentType}_${testMode}_${level}`;
      const data = await AsyncStorage.getItem(key);
      return data === 'true';
    } catch (error) {
      console.error('Error loading test finished:', error);
      return false;
    }
  }

  // Vocabulary için son index'i kaydet
  static async saveVocabularyLastIndex(index: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VOCABULARY_LAST_INDEX, String(index));
    } catch (error) {
      console.error('Error saving vocabulary last index:', error);
    }
  }

  // Vocabulary için son index'i getir
  static async getVocabularyLastIndex(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VOCABULARY_LAST_INDEX);
      return data ? parseInt(data, 10) : 0;
    } catch (error) {
      console.error('Error getting vocabulary last index:', error);
      return 0;
    }
  }

  // Sentences için son index'i kaydet
  static async saveSentencesLastIndex(index: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SENTENCES_LAST_INDEX, String(index));
    } catch (error) {
      console.error('Error saving sentences last index:', error);
    }
  }

  // Sentences için son index'i getir
  static async getSentencesLastIndex(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SENTENCES_LAST_INDEX);
      return data ? parseInt(data, 10) : 0;
    } catch (error) {
      console.error('Error getting sentences last index:', error);
      return 0;
    }
  }

  // Tüm verileri sıfırla (geliştirme için)
  static async clearAllData(): Promise<void> {
    try {
      // AsyncStorage'dan tüm anahtarları temizle
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.VOCABULARY,
        STORAGE_KEYS.SENTENCES,
        STORAGE_KEYS.PROGRESS,
        STORAGE_KEYS.LAST_STUDY_DATE,
        STORAGE_KEYS.STREAK_DAYS,
        STORAGE_KEYS.TEST_PROGRESS,
        STORAGE_KEYS.TEST_FINISHED,
        STORAGE_KEYS.VOCABULARY_LAST_INDEX,
        STORAGE_KEYS.SENTENCES_LAST_INDEX,
      ]);
      
      // Test progress ve finished için tüm kombinasyonları temizle
      const allKeys = await AsyncStorage.getAllKeys();
      const testProgressKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.TEST_PROGRESS));
      const testFinishedKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.TEST_FINISHED));
      if (testProgressKeys.length > 0 || testFinishedKeys.length > 0) {
        await AsyncStorage.multiRemove([...testProgressKeys, ...testFinishedKeys]);
      }
      
      // Cache'i de temizle
      this.clearCache();
      
      console.log('✅ Tüm veriler temizlendi');
    } catch (error) {
      console.error('❌ Veri temizleme hatası:', error);
    }
  }
}

