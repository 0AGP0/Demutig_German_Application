import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { UserProgress } from '../models/Progress';
import { LessonProgress } from '../models/Lesson';

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
  LESSON_PROGRESS: '@german_app:lesson_progress',
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
      
      // Yeni kelime mi yoksa güncelleme mi?
      const isNewWord = index === -1;
      
      // Eğer kelime bulunamadıysa ve wordData varsa, yeni kelime ekle
      if (isNewWord && wordData) {
        const now = new Date().toISOString();
        const today = new Date().toDateString();
        
        const newWord: any = {
          ...wordData,
          known: known,
          last_reviewed: now,
          review_count: 1,
          correct_count: known ? 1 : 0,
          wrong_count: known ? 0 : 1,
          daily_reviewed_date: now,
          knownCount: known ? 1 : 0, // İlk swipe: 1 veya 0
          status: known ? 'learning' : 'new',
        };
        
        if (known) {
          newWord.learned_date = now;
        }
        
        // Status hesapla
        const currentKnownCount = newWord.knownCount || 0;
        if (currentKnownCount >= 3) {
          newWord.status = 'mastered';
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 7);
          newWord.next_review_date = nextReview.toISOString();
        } else if (currentKnownCount > 0) {
          newWord.status = 'learning';
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1);
          newWord.next_review_date = nextReview.toISOString();
        }
        
        vocab.push(newWord);
        await AsyncStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(vocab));
        this.clearCache();
        return; // Yeni kelime eklendi, fonksiyondan çık!
      }
      
      // Mevcut kelimeyi güncelle
      if (index !== -1) {
        const now = new Date().toISOString();
        const today = new Date().toDateString();
        vocab[index].known = known;
        vocab[index].last_reviewed = now;
        vocab[index].review_count = (vocab[index].review_count || 0) + 1;
        
        // knownCount güncelle
        if (known) {
          // Sağa swipe (Biliyorum) → knownCount +1
          vocab[index].knownCount = (vocab[index].knownCount || 0) + 1;
          // İlk öğrenme tarihi
          if (!vocab[index].learned_date) {
            vocab[index].learned_date = now;
          }
        } else {
          // Sola swipe (Bilmiyorum) → knownCount'ı azalt (0'ın altına düşmesin)
          vocab[index].knownCount = Math.max(0, (vocab[index].knownCount || 0) - 1);
        }
        
        const currentKnownCount = vocab[index].knownCount || 0;
        
        // Status ve next_review_date'i birlikte hesapla
        if (currentKnownCount >= 3) {
          // Mastered: 7 gün sonra tekrar
          vocab[index].status = 'mastered';
          vocab[index].known = true;
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 7);
          vocab[index].next_review_date = nextReview.toISOString();
        } else if (currentKnownCount > 0) {
          // Learning: 1 gün sonra tekrar
          vocab[index].status = 'learning';
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1);
          vocab[index].next_review_date = nextReview.toISOString();
        } else {
          // New: henüz hiç bilmedi
          vocab[index].status = 'new';
          vocab[index].known = false;
          // next_review_date yok (yeni kelime)
        }
        
        // Bugün değerlendirilen kelimeleri takip et (Dashboard için)
        const lastDailyReview = vocab[index].daily_reviewed_date 
          ? new Date(vocab[index].daily_reviewed_date as string).toDateString() 
          : null;
        
        if (!lastDailyReview || lastDailyReview !== today) {
          vocab[index].daily_reviewed_date = now;
        }
        
        // Doğru/yanlış sayısını güncelle
        if (known) {
          vocab[index].correct_count = (vocab[index].correct_count || 0) + 1;
        } else {
          vocab[index].wrong_count = (vocab[index].wrong_count || 0) + 1;
        }
        
        // Zorluk seviyesini hesapla
        const wrongCount = vocab[index].wrong_count || 0;
        const correctCount = vocab[index].correct_count || 0;
        const totalAttempts = wrongCount + correctCount;
        
        if (totalAttempts > 0) {
          const wrongRatio = wrongCount / totalAttempts;
          vocab[index].difficulty_level = Math.min(5, Math.max(1, Math.ceil(wrongRatio * 5)));
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
    // Cache kontrolü - eğer useCache false ise her zaman bypass et
    if (useCache && vocabularyCache && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return Array.isArray(vocabularyCache) ? vocabularyCache : [];
    }
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VOCABULARY);
      if (!data) return [];
      
      let result;
      try {
        result = JSON.parse(data);
      } catch (parseError) {
        console.error('Error parsing vocabulary JSON:', parseError);
        // Bozuk veriyi temizle
        await AsyncStorage.removeItem(STORAGE_KEYS.VOCABULARY);
        return [];
      }
      
      // Güvenlik kontrolü: result array olmalı
      if (!Array.isArray(result)) {
        console.error('Vocabulary data is not an array');
        await AsyncStorage.removeItem(STORAGE_KEYS.VOCABULARY);
        return [];
      }
      
      // Cache'i güncelle - sadece useCache true ise
      if (useCache) {
        vocabularyCache = result;
        cacheTimestamp = Date.now();
      }
      return result;
    } catch (error) {
      console.error('Error getting vocabulary:', error);
      return [];
    }
  }

  // Cümle pratiğini kaydet (practiced: true/false)
  static async markSentencePracticed(sentenceId: number, practiced: boolean = true, sentenceData?: any): Promise<void> {
    try {
      // Cache'i bypass et - her zaman güncel verileri al
      const sentences = await this.getSentences(false);
      // ID eşleşmesi - hem number hem string karşılaştırması yap
      const index = sentences.findIndex(s => {
        const sId = Number(s.id); // Her zaman number'a çevir
        const targetId = Number(sentenceId); // Her zaman number'a çevir
        return sId === targetId;
      });
      const now = new Date().toISOString();
      const today = new Date().toDateString();
      
      console.log('💾 markSentencePracticed:', sentenceId, 'type:', typeof sentenceId, 'practiced:', practiced, 'found index:', index);
      console.log('💾 Total sentences in storage:', sentences.length);
      if (sentences.length > 0 && index === -1) {
        // Debug: İlk 5 sentence ID'sini göster
        console.log('💾 First 5 sentence IDs:', sentences.slice(0, 5).map(s => ({ id: s.id, type: typeof s.id })));
      }
      
      if (index !== -1) {
        // Mevcut cümleyi güncelle
        sentences[index].practiced = practiced;
        sentences[index].practiced_date = now;
        
        // Review count güncelle
        sentences[index].review_count = (sentences[index].review_count || 0) + 1;
        
        // practicedCount güncelle
        if (practiced) {
          // Sağa swipe (Biliyorum) → practicedCount +1
          const oldCount = sentences[index].practicedCount || 0;
          sentences[index].practicedCount = oldCount + 1;
          console.log('📈 Sentence practicedCount:', sentenceId, oldCount, '->', sentences[index].practicedCount);
        } else {
          // Sola swipe (Bilmiyorum) → practicedCount'ı azalt (0'ın altına düşmesin)
          sentences[index].practicedCount = Math.max(0, (sentences[index].practicedCount || 0) - 1);
        }
        
        const currentPracticedCount = sentences[index].practicedCount || 0;
        
        // Status ve next_review_date'i birlikte hesapla
        if (currentPracticedCount >= 3) {
          // Mastered: 7 gün sonra tekrar
          sentences[index].status = 'mastered';
          sentences[index].practiced = true;
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 7);
          sentences[index].next_review_date = nextReview.toISOString();
          console.log('⭐ Sentence mastered:', sentenceId);
        } else if (currentPracticedCount > 0) {
          // Learning: 1 gün sonra tekrar
          sentences[index].status = 'learning';
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1);
          sentences[index].next_review_date = nextReview.toISOString();
        } else {
          // New: henüz hiç pratik yapmadı
          sentences[index].status = 'new';
          sentences[index].practiced = false;
          // next_review_date yok (yeni cümle)
        }
        
        // daily_reviewed_date güncelle (Dashboard için)
        const lastDailyReview = sentences[index].daily_reviewed_date 
          ? new Date(sentences[index].daily_reviewed_date as string).toDateString() 
          : null;
        
        if (!lastDailyReview || lastDailyReview !== today) {
          sentences[index].daily_reviewed_date = now;
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
        // Cache'i güncelle - yeni veriyi cache'e yaz (hemen güncelle ki bir sonraki çağrıda güncel veri dönsün)
        sentencesCache = [...sentences]; // Yeni array oluştur
        cacheTimestamp = Date.now();
        console.log('💾 Sentence saved:', sentenceId, 'practicedCount:', sentences[index].practicedCount, 'status:', sentences[index].status);
        console.log('💾 Cache updated, total sentences in cache:', sentencesCache.length);
      } else {
        // Yeni cümle ekle
        console.log('➕ New sentence, adding to storage:', sentenceId);
        // sentenceData içindeki practiced değerini override etmemek için önce spread, sonra practiced set et
        const reviewCount = 1;
        const nextReview = new Date();
        
        // Spaced repetition: Bir sonraki tekrar tarihini hesapla
        if (practiced) {
          // Biliyorum: Daha uzun süre sonra tekrar et
          const daysToAdd = Math.min(30, Math.pow(2, reviewCount)); // 2 gün
          nextReview.setDate(nextReview.getDate() + daysToAdd);
        } else {
          // Bilmiyorum: Daha kısa süre sonra tekrar et
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
        // Cache'i güncelle - yeni veriyi cache'e yaz (hemen güncelle ki bir sonraki çağrıda güncel veri dönsün)
        sentencesCache = [...sentences]; // Yeni array oluştur
        cacheTimestamp = Date.now();
        console.log('💾 New sentence saved:', sentenceId, 'practicedCount:', newSentence.practicedCount, 'status:', newSentence.status);
        console.log('💾 Cache updated, total sentences in cache:', sentencesCache.length);
      }
    } catch (error) {
      console.error('Error marking sentence practiced:', error);
    }
  }

  // Cümleleri getir
  static async getSentences(useCache: boolean = true): Promise<Sentence[]> {
    // Cache kontrolü - eğer useCache false ise her zaman bypass et
    if (useCache && sentencesCache && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return Array.isArray(sentencesCache) ? sentencesCache : [];
    }
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SENTENCES);
      if (!data) return [];
      
      let result;
      try {
        result = JSON.parse(data);
      } catch (parseError) {
        console.error('Error parsing sentences JSON:', parseError);
        // Bozuk veriyi temizle
        await AsyncStorage.removeItem(STORAGE_KEYS.SENTENCES);
        return [];
      }
      
      // Güvenlik kontrolü: result array olmalı
      if (!Array.isArray(result)) {
        console.error('Sentences data is not an array');
        await AsyncStorage.removeItem(STORAGE_KEYS.SENTENCES);
        return [];
      }
      
      // Cache'i güncelle - sadece useCache true ise
      if (useCache) {
        sentencesCache = result;
        cacheTimestamp = Date.now();
      }
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
        const practiced = testMode === 'unknown' && isCorrect; // Bilmiyorum modunda doğru cevap → practiced: true (Biliyorum)
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
      if (!data) return null;
      
      let result;
      try {
        result = JSON.parse(data);
      } catch (parseError) {
        console.error('Error parsing progress JSON:', parseError);
        // Bozuk veriyi temizle
        await AsyncStorage.removeItem(STORAGE_KEYS.PROGRESS);
        return null;
      }
      
      // Güvenlik kontrolü: result object olmalı
      if (!result || typeof result !== 'object') {
        console.error('Progress data is not an object');
        await AsyncStorage.removeItem(STORAGE_KEYS.PROGRESS);
        return null;
      }
      
      return result;
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
      // Önce tüm key'leri al
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🗑️ Temizlenecek key sayısı:', allKeys.length);
      console.log('🗑️ Key\'ler:', allKeys);
      
      // Uygulamaya ait tüm key'leri bul (@german_app: ile başlayan)
      const appKeys = allKeys.filter(key => key.startsWith('@german_app:'));
      
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
        console.log('✅ Temizlenen key sayısı:', appKeys.length);
      }
      
      // Cache'i de temizle
      this.clearCache();
      
      // Doğrulama: Kalan key'leri kontrol et
      const remainingKeys = await AsyncStorage.getAllKeys();
      const remainingAppKeys = remainingKeys.filter(key => key.startsWith('@german_app:'));
      if (remainingAppKeys.length > 0) {
        console.log('⚠️ Kalan key\'ler:', remainingAppKeys);
        // Kalan key'leri de temizle
        await AsyncStorage.multiRemove(remainingAppKeys);
      }
      
      console.log('✅ Tüm veriler temizlendi');
    } catch (error) {
      console.error('❌ Veri temizleme hatası:', error);
    }
  }

  // Lesson Progress Fonksiyonları
  static async getLessonProgress(useCache: boolean = false): Promise<Record<string, LessonProgress>> {
    // useCache false ise her zaman AsyncStorage'dan oku
    try {
      // Cache kullanma - her zaman güncel verileri al
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LESSON_PROGRESS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting lesson progress:', error);
      return {};
    }
  }

  static async saveLessonProgress(progress: Record<string, LessonProgress>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LESSON_PROGRESS, JSON.stringify(progress));
      // Yazma işleminin tamamlandığından emin ol
      console.log('💾 Lesson progress saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving lesson progress:', error);
    }
  }

  static async updateLessonProgress(lessonId: string, updates: Partial<LessonProgress>): Promise<void> {
    try {
      // Cache bypass - her zaman güncel verileri al
      const allProgress = await this.getLessonProgress(false);
      const current = allProgress[lessonId] || {
        lesson_id: lessonId,
        completed: false,
        grammar_read: false,
        vocab_mastered_count: 0,
        sentence_mastered_count: 0,
      };
      
      const updated = {
        ...current,
        ...updates,
        lesson_id: lessonId,
      };
      
      allProgress[lessonId] = updated;
      
      await this.saveLessonProgress(allProgress);
      console.log('💾 Lesson progress updated:', lessonId, 'completed:', updated.completed);
    } catch (error) {
      console.error('Error updating lesson progress:', error);
    }
  }

  static async markLessonGrammarRead(lessonId: string): Promise<void> {
    await this.updateLessonProgress(lessonId, { grammar_read: true });
  }

  static async markLessonCompleted(lessonId: string): Promise<void> {
    const now = new Date().toISOString();
    const allProgress = await this.getLessonProgress(false); // Cache bypass
    const current = allProgress[lessonId];
    
    console.log('✅ markLessonCompleted:', lessonId, 'current progress:', current);
    
    await this.updateLessonProgress(lessonId, {
      completed: true,
      completed_at: now,
      started_at: current?.started_at || now,
    });
    
    // AsyncStorage'a yazma işleminin tamamlandığından emin ol - doğrulama
    const verifyProgress = await this.getLessonProgress(false);
    const verified = verifyProgress[lessonId];
    console.log('✅ Verification - Lesson completed:', lessonId, 'verified completed:', verified?.completed);
    
    // Cache'i temizle ki LessonListScreen güncel verileri görsün
    this.clearCache();
    console.log('✅ Lesson marked as completed:', lessonId);
  }

  static async getLessonProgressById(lessonId: string): Promise<LessonProgress | null> {
    // Cache bypass - her zaman güncel verileri al
    const allProgress = await this.getLessonProgress(false);
    const progress = allProgress[lessonId] || null;
    console.log('📊 getLessonProgressById:', lessonId, 'completed:', progress?.completed);
    return progress;
  }

  // Son görülen kelimeyi kaydet (id veya german)
  static async saveLastSeenWord(wordIdentifier: string | number): Promise<void> {
    try {
      await AsyncStorage.setItem('@german_app:last_seen_word', String(wordIdentifier));
      console.log('💾 Son görülen kelime kaydedildi:', wordIdentifier);
    } catch (error) {
      console.error('Error saving last seen word:', error);
    }
  }
  
  // Son görülen kelimeyi getir
  static async getLastSeenWord(): Promise<string | null> {
    try {
      const word = await AsyncStorage.getItem('@german_app:last_seen_word');
      console.log('📖 Son görülen kelime:', word);
      return word;
    } catch (error) {
      console.error('Error getting last seen word:', error);
      return null;
    }
  }

  // Favorilere ekle/çıkar
  static async toggleFavorite(identifier: string | number, isFavorite: boolean): Promise<void> {
    try {
      const vocab = await this.getVocabulary(false);
      let index = -1;
      
      if (typeof identifier === 'number') {
        index = vocab.findIndex(v => v.id === identifier);
      } else if (typeof identifier === 'string') {
        index = vocab.findIndex(v => v.german === identifier || v.word === identifier);
      }
      
      if (index !== -1) {
        vocab[index].isFavorite = isFavorite;
        await AsyncStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(vocab));
        this.clearCache();
        console.log('⭐ Favori güncellendi:', identifier, isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  // Yarın tekrar göster (next_review_date'i yarına ayarla)
  static async addToReview(identifier: string | number): Promise<void> {
    try {
      const vocab = await this.getVocabulary(false);
      let index = -1;
      
      if (typeof identifier === 'number') {
        index = vocab.findIndex(v => v.id === identifier);
      } else if (typeof identifier === 'string') {
        index = vocab.findIndex(v => v.german === identifier || v.word === identifier);
      }
      
      if (index !== -1) {
        // Yarın için review tarihi ayarla (status'u değiştirme - ekran hesaplayacak)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        vocab[index].next_review_date = tomorrow.toISOString();
        // Status'u koruyalım - ekran next_review_date'e göre 'review' olarak gösterecek
        
        await AsyncStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(vocab));
        this.clearCache();
        console.log('↻ Tekrar tarihi ayarlandı:', identifier, 'yarın');
      }
    } catch (error) {
      console.error('Error adding to review:', error);
    }
  }
}

