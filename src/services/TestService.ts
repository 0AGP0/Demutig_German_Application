import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { StorageService } from './StorageService';
import { DataService } from './DataService';

export type TestMode = 'unknown' | 'known' | 'mixed' | 'review';
export type ReviewPeriod = 'today' | 'yesterday' | 'week' | 'month';

export class TestService {
  /**
   * Test moduna göre kelimeleri filtrele
   */
  static async getWordsForTest(
    level: 'A1' | 'A2' | 'B1' | 'B2',
    testMode: TestMode,
    limit?: number
  ): Promise<Vocabulary[]> {
    const allWords = await DataService.loadVocabulary(level);
    const savedWords = await StorageService.getVocabulary();
    
    // Saved words ile merge et
    const mergedWords = allWords.map(word => {
      const identifier = word.german || word.word;
      const saved = savedWords.find(w => 
        (w.german && w.german === identifier) || 
        (w.word && w.word === identifier) ||
        (w.id && w.id === word.id)
      );
      return saved ? { ...word, ...saved } : word;
    });
    
    let filteredWords: Vocabulary[] = [];
    
    switch (testMode) {
      case 'unknown':
        // Sadece kullanıcının "bilmediğim" olarak işaretlediği kelimeler
        // (known: false VE last_reviewed var - yani kullanıcı bu kelimeyi görmüş ve sola swipe etmiş)
        // NOT: Vocabulary ekranında sadece bilinmeyen kelimeler gösteriliyor, 
        // ama Test'te sadece kullanıcının aktif olarak değerlendirdiği kelimeler gözükmeli
        filteredWords = mergedWords.filter(w => {
          // Kullanıcı bu kelimeyi görmüş mü? (last_reviewed var mı?)
          if (!w.last_reviewed) return false;
          // Bilinmiyor mu?
          if (w.known) return false;
          // Kullanıcı sola swipe etmiş mi? (wrong_count > 0 veya en az bir kez değerlendirilmiş)
          // last_reviewed varsa zaten değerlendirilmiş demektir
          return true;
        });
        break;
      case 'known':
        // Sadece bildiği kelimeler (pekiştirme)
        filteredWords = mergedWords.filter(w => w.known);
        break;
      case 'mixed':
        // Karışık (tüm kelimeler)
        filteredWords = mergedWords;
        break;
      case 'review':
        // Tekrar zamanı gelen kelimeler (spaced repetition)
        const now = new Date();
        filteredWords = mergedWords.filter(w => {
          if (!w.next_review_date) return false;
          const reviewDate = new Date(w.next_review_date);
          return reviewDate <= now;
        });
        // Zorluk seviyesine göre sırala (zor olanlar önce)
        filteredWords.sort((a, b) => {
          const diffA = a.difficulty_level || 1;
          const diffB = b.difficulty_level || 1;
          return diffB - diffA;
        });
        break;
    }
    
    // Limit varsa uygula
    if (limit) {
      filteredWords = filteredWords.slice(0, limit);
    }
    
    return filteredWords;
  }

  /**
   * Günlük review kelimelerini getir
   */
  static async getDailyReviewWords(period: ReviewPeriod): Promise<Vocabulary[]> {
    const savedWords = await StorageService.getVocabulary();
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'yesterday':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        return savedWords.filter(w => {
          if (!w.learned_date) return false;
          const learned = new Date(w.learned_date);
          return learned >= startDate && learned <= endDate;
        });
        
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        return savedWords.filter(w => {
          if (!w.learned_date) return false;
          return new Date(w.learned_date) >= startDate;
        });
        
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        return savedWords.filter(w => {
          if (!w.learned_date) return false;
          return new Date(w.learned_date) >= startDate;
        });
        
      case 'today':
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        return savedWords.filter(w => {
          if (!w.learned_date) return false;
          return new Date(w.learned_date) >= startDate;
        });
    }
  }

  /**
   * Quiz için rastgele kelimeler seç
   */
  static async getRandomWordsForQuiz(
    level: 'A1' | 'A2' | 'B1' | 'B2' | null,
    count: number,
    includeKnown: boolean = true
  ): Promise<Vocabulary[]> {
    const allWords = await DataService.loadVocabulary(level || 'A1');
    const savedWords = await StorageService.getVocabulary();
    
    const mergedWords = allWords.map(word => {
      const identifier = word.german || word.word;
      const saved = savedWords.find(w => 
        (w.german && w.german === identifier) || 
        (w.word && w.word === identifier) ||
        (w.id && w.id === word.id)
      );
      return saved ? { ...word, ...saved } : word;
    });
    
    // Filtrele
    let filteredWords = mergedWords;
    if (!includeKnown) {
      filteredWords = filteredWords.filter(w => !w.known);
    }
    
    // Rastgele karıştır
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    
    return shuffled.slice(0, count);
  }

  /**
   * Çoktan seçmeli soru için yanlış seçenekler oluştur
   */
  static async getWrongOptions(
    correctWord: Vocabulary,
    level: 'A1' | 'A2' | 'B1' | 'B2',
    count: number = 3
  ): Promise<string[]> {
    const allWords = await DataService.loadVocabulary(level);
    
    // Doğru kelimeyi hariç tut
    const wrongWords = allWords.filter(w => {
      const correctId = correctWord.id || correctWord.german || correctWord.word;
      const wordId = w.id || w.german || w.word;
      return correctId !== wordId;
    });
    
    // Rastgele seç
    const shuffled = [...wrongWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    // Anlamlarını döndür
    return selected.map(w => w.english || w.meaning_tr || '');
  }

  /**
   * İstatistikler: Zor kelimeleri getir
   */
  static async getDifficultWords(limit: number = 10): Promise<Vocabulary[]> {
    const savedWords = await StorageService.getVocabulary();
    
    // Zorluk seviyesine göre sırala
    const difficult = savedWords
      .filter(w => (w.difficulty_level || 1) >= 3)
      .sort((a, b) => {
        const diffA = a.difficulty_level || 1;
        const diffB = b.difficulty_level || 1;
        if (diffB !== diffA) return diffB - diffA;
        // Aynı zorlukta ise yanlış sayısına göre
        return (b.wrong_count || 0) - (a.wrong_count || 0);
      });
    
    return difficult.slice(0, limit);
  }

  /**
   * İstatistikler: İlerleme bilgisi - SADECE TEST SONUÇLARI
   */
  static async getProgressStats() {
    const savedWords = await StorageService.getVocabulary();
    
    const total = savedWords.length;
    const known = savedWords.filter(w => w.known).length;
    const unknown = total - known;
    
    // SADECE TEST SONUÇLARINI SAY (test_correct_count ve test_wrong_count)
    const totalCorrect = savedWords.reduce((sum, w) => sum + (w.test_correct_count || 0), 0);
    const totalWrong = savedWords.reduce((sum, w) => sum + (w.test_wrong_count || 0), 0);
    const totalAttempts = totalCorrect + totalWrong;
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    
    const needsReview = savedWords.filter(w => {
      if (!w.next_review_date) return false;
      return new Date(w.next_review_date) <= new Date();
    }).length;
    
    return {
      total,
      known,
      unknown,
      totalCorrect,
      totalWrong,
      totalAttempts,
      accuracy: Math.round(accuracy),
      needsReview,
    };
  }

  /**
   * Test moduna göre cümleleri filtrele
   */
  static async getSentencesForTest(
    level: 'A1' | 'A2' | 'B1' | 'B2',
    testMode: TestMode,
    limit?: number
  ): Promise<Sentence[]> {
    const allSentences = await DataService.loadSentences(1000, level);
    const savedSentences = await StorageService.getSentences();
    
    // Saved sentences ile merge et - saved değerleri öncelikli olmalı
    const mergedSentences = allSentences.map(sentence => {
      const saved = savedSentences.find(s => s.id === sentence.id);
      if (saved) {
        // Saved değerler varsa, onları kullan (özellikle practiced değeri önemli)
        return { ...sentence, ...saved };
      }
      return sentence;
    });
    
    let filteredSentences: Sentence[] = [];
    
    switch (testMode) {
      case 'unknown':
        // Sadece kullanıcının "Bilmiyorum" olarak işaretlediği cümleler
        // practiced_date olan VE practiced === false olanlar
        filteredSentences = mergedSentences.filter(s => {
          // Hiç değerlendirilmemiş cümleleri dahil etme
          if (!s.practiced_date) return false;
          // Sadece açıkça practiced === false olanları getir (Bilmiyorum)
          // undefined veya null değerleri dahil etme
          return s.practiced === false;
        });
        break;
      case 'known':
        // Sadece bildiği cümleler (pekiştirme)
        // practiced === true olanlar (Biliyorum)
        // AMA tekrar zamanı gelmemiş olanlar (next_review_date > now veya next_review_date yok)
        // Yani henüz tekrar etmesi gerekmeyen, sadece pekiştirme için test edilebilen cümleler
        const nowForKnown = new Date();
        filteredSentences = mergedSentences.filter(s => {
          if (s.practiced !== true) return false;
          // Eğer next_review_date varsa ve henüz gelmemişse, "bildiğim" kategorisinde göster
          // Eğer next_review_date yoksa veya henüz gelmemişse, "bildiğim" kategorisinde göster
          if (s.next_review_date) {
            const reviewDate = new Date(s.next_review_date);
            // Tekrar zamanı gelmemişse "bildiğim" kategorisinde göster
            return reviewDate > nowForKnown;
          }
          // next_review_date yoksa, "bildiğim" kategorisinde göster
          return true;
        });
        break;
      case 'mixed':
        // Karışık (tüm cümleler)
        filteredSentences = mergedSentences;
        break;
      case 'review':
        // Tekrar zamanı gelen cümleler (spaced repetition)
        // practiced === true VE next_review_date <= now olan cümleler
        const nowForReview = new Date();
        filteredSentences = mergedSentences.filter(s => {
          if (!s.practiced) return false;
          // next_review_date olmalı ve tekrar zamanı gelmiş olmalı
          if (!s.next_review_date) return false;
          const reviewDate = new Date(s.next_review_date);
          return reviewDate <= nowForReview;
        });
        // Zorluk seviyesine göre sırala (daha sık tekrar edilmesi gerekenler önce)
        filteredSentences.sort((a, b) => {
          if (!a.next_review_date) return 1;
          if (!b.next_review_date) return -1;
          const dateA = new Date(a.next_review_date).getTime();
          const dateB = new Date(b.next_review_date).getTime();
          return dateA - dateB; // Daha eski tarihler önce (daha acil)
        });
        break;
    }
    
    // Limit varsa uygula
    if (limit) {
      filteredSentences = filteredSentences.slice(0, limit);
    }
    
    return filteredSentences;
  }

  /**
   * Çoktan seçmeli soru için yanlış seçenekler oluştur (cümleler için)
   */
  static async getWrongOptionsForSentence(
    correctSentence: Sentence,
    level: 'A1' | 'A2' | 'B1' | 'B2',
    count: number = 3
  ): Promise<string[]> {
    const allSentences = await DataService.loadSentences(1000, level);
    
    // Doğru cümleyi hariç tut
    const wrongSentences = allSentences.filter(s => {
      const correctId = correctSentence.id;
      const sentenceId = s.id;
      return correctId !== sentenceId;
    });
    
    // Rastgele seç
    const shuffled = [...wrongSentences].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    // Çevirilerini döndür
    return selected.map(s => s.english_translation || s.tr || s.en || '');
  }
}
