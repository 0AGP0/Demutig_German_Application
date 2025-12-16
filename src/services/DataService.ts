import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { Reading } from '../models/Reading';
import { Grammar } from '../models/Grammar';
import { vocabularyData } from './vocabularyLoader';
import { getWordRank, calculatePriorityScore, sortByFrequency } from './FrequencyService';

// Bu servis JSON dosyalarını assets/data'dan okuyacak
// Şimdilik mock data kullanacağız, sonra gerçek JSON dosyaları eklenecek

export class DataService {
  // Kelimeleri yükle (Yeni format: Langenscheidt)
  static async loadVocabulary(level?: 'A1' | 'A2' | 'B1' | 'B2'): Promise<Vocabulary[]> {
    try {
      // Yeni format: vocab_langenscheidt.json
      try {
        const vocabData = require('../../assets/data/vocab_langenscheidt.json');
        let vocab = vocabData.map((v: any) => ({
          ...v,
          known: v.known || false,
          review_count: v.review_count || 0,
        }));
        
        // Seviyeye göre filtrele
        if (level) {
          vocab = vocab.filter((v: Vocabulary) => v.level === level);
        }
        
        return vocab;
      } catch (e) {
        // Fallback: Anki formatı (statik require)
        let allVocab: any[] = [];
        
        try {
          const a1Data = require('../../assets/data/vocabulary/A1.json');
          allVocab = [...allVocab, ...a1Data];
        } catch (e1) {
          // A1 dosyası yok
        }
        
        try {
          const a2Data = require('../../assets/data/vocabulary/A2.json');
          allVocab = [...allVocab, ...a2Data];
        } catch (e2) {
          // A2 dosyası yok
        }
        
        try {
          const b1Data = require('../../assets/data/vocabulary/B1.json');
          allVocab = [...allVocab, ...b1Data];
        } catch (e3) {
          // B1 dosyası yok
        }
        
        try {
          const b2Data = require('../../assets/data/vocabulary/B2.json');
          allVocab = [...allVocab, ...b2Data];
        } catch (e4) {
          // B2 dosyası yok
        }
        
        // Eğer hala boşsa, vocabularyLoader kullan
        if (allVocab.length === 0) {
          if (vocabularyData.A1) allVocab = [...allVocab, ...vocabularyData.A1];
          if (vocabularyData.A2) allVocab = [...allVocab, ...vocabularyData.A2];
          if (vocabularyData.B1) allVocab = [...allVocab, ...vocabularyData.B1];
          if (vocabularyData.B2) allVocab = [...allVocab, ...vocabularyData.B2];
        }
        
        const filtered = level 
          ? allVocab.filter((v: any) => v.level === level)
          : allVocab;
        
        return filtered.map((v: any) => ({
          ...v,
          known: v.known || false,
          review_count: v.review_count || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      return [];
    }
  }

  // Cümleleri yükle (Yeni format: 7k Sentences) - Kelimeler gibi basit
  static async loadSentences(count: number = 5, level?: 'A1' | 'A2' | 'B1' | 'B2'): Promise<Sentence[]> {
    try {
      // Metro bundler cache sorunu için yeni dosya adı kullanıyoruz
      let sentencesData;
      try {
        // Önce yeni dosya adını dene (cache sorununu önlemek için)
        sentencesData = require('../../assets/data/german_sentences/sentences_7k.json');
        console.log('DataService: sentences_7k.json yüklendi (yeni dosya adı)');
      } catch (e) {
        console.error('DataService: Yeni dosya adından yüklenemedi, eski dosya adını deniyor...', e);
        try {
          sentencesData = require('../../assets/data/german_sentences/german_7k_sentences_final.json');
          console.log('DataService: german_7k_sentences_final.json yüklendi (yeni klasör)');
        } catch (e2) {
          console.error('DataService: Yeni klasörden yüklenemedi, eski klasörü deniyor...', e2);
          try {
            sentencesData = require('../../assets/data/sentences/german_7k_sentences_final.json');
            console.log('DataService: german_7k_sentences_final.json yüklendi (eski klasör)');
          } catch (e3) {
            try {
              sentencesData = require('../../assets/data/sentences/sentences_data_7k.json');
              console.log('DataService: sentences_data_7k.json yüklendi (fallback)');
            } catch (e4) {
            console.error('DataService: Hiçbir cümle dosyası yüklenemedi!');
            return [];
            }
          }
        }
      }
      
      console.log('DataService: Toplam cümle:', Array.isArray(sentencesData) ? sentencesData.length : 'NOT ARRAY');
      
      if (!Array.isArray(sentencesData)) {
        console.error('DataService: Cümle dosyası bir array değil!', typeof sentencesData);
        return [];
      }
      
      if (sentencesData.length === 0) {
        console.warn('DataService: Cümle dosyası boş!');
        return [];
      }
      
      // ÖNCE format kontrolü - eğer readings formatı yüklenmişse (title, text_de, text_tr varsa)
      if (sentencesData.length > 0 && sentencesData[0].title && sentencesData[0].text_de && !sentencesData[0].german_sentence) {
        console.error('DataService: HATA - readings.json yüklendi, sentences.json değil!');
        console.error('DataService: İlk öğe keys:', Object.keys(sentencesData[0]));
        console.error('DataService: Metro bundler yanlış dosyayı yüklüyor!');
        console.error('DataService: Çözüm: npx expo start --clear veya dosya adını değiştir');
        return [];
      }
      
      // Yanlış dosya kontrolü - eğer 7019'dan az cümle varsa
      if (sentencesData.length < 100) {
        console.error('DataService: HATA - Yanlış dosya yüklendi!');
        console.error('DataService: Toplam cümle:', sentencesData.length, '(olması gereken: 7019)');
        console.error('DataService: İlk öğe keys:', sentencesData.length > 0 ? Object.keys(sentencesData[0]) : 'N/A');
        console.error('DataService: Metro bundler cache sorunu!');
        console.error('DataService: Çözüm: npx expo start --clear');
        // Yanlış format tespit edildi, boş döndür
        return [];
      }
      
      // Format kontrolü - eğer de varsa ama german_sentence yoksa, de'yi german_sentence'e çevir
      if (sentencesData.length > 0 && sentencesData[0].de && !sentencesData[0].german_sentence) {
        console.log('DataService: Tatoeba formatı tespit edildi, dönüştürülüyor...');
        sentencesData = sentencesData.map((s: any) => ({
          ...s,
          german_sentence: s.de || s.german_sentence,
          english_translation: s.en || s.tr || s.english_translation,
        }));
      }
      
      // İlk cümlenin raw halini kontrol et
      const firstSentence = sentencesData[0];
      console.log('DataService: İlk cümle keys:', Object.keys(firstSentence));
      console.log('DataService: İlk cümle id:', firstSentence.id);
      console.log('DataService: İlk cümle german_sentence:', firstSentence.german_sentence ? 'VAR' : 'YOK');
      console.log('DataService: İlk cümle level:', firstSentence.level);
      
      // Kelimeler gibi direkt map et, tüm alanları koru (spread operator kullan)
      let sentences = sentencesData.map((s: any) => ({
        ...s, // Tüm alanları koru
        practiced: s.practiced || false,
      }));
      
      console.log('DataService: Map sonrası toplam cümle:', sentences.length);
      if (sentences.length > 0) {
        console.log('DataService: Map sonrası ilk cümle id:', sentences[0].id);
        console.log('DataService: Map sonrası ilk cümle german_sentence:', sentences[0].german_sentence ? 'VAR' : 'YOK');
      }
      
      // Seviyeye göre filtrele
      if (level) {
        const beforeFilter = sentences.length;
        sentences = sentences.filter((s: Sentence) => s.level === level);
        console.log(`DataService: Seviye filtresi (${level}): ${beforeFilter} -> ${sentences.length}`);
      }
      
      // İlk N tanesini al
      const result = sentences.slice(0, count);
      console.log('DataService: Sonuç (ilk', count, 'cümle):', result.length);
      return result;
    } catch (error) {
      console.error('DataService: Error loading sentences:', error);
      console.error('DataService: Cümle yükleme hatası:', error);
      return [];
    }
  }

  // Okuma metinlerini yükle
  static async loadReadings(level?: 'A1' | 'A2' | 'B1' | 'B2'): Promise<Reading[]> {
    try {
      // Sadece mevcut dosyayı yükle (readings.json)
      const readingsData = require('../../assets/data/readings/readings.json');
      const readings: Reading[] = readingsData.map((r: any) => ({
        ...r,
        completed: false,
      }));
      return readings.filter((r: Reading) => !level || r.level === level);
    } catch (error) {
      // Dosya yoksa boş döndür
      return [];
    }
  }

  // Gramer konularını yükle
  static async loadGrammar(level?: 'A1' | 'A2' | 'B1' | 'B2'): Promise<Grammar[]> {
    try {
      // Sadece mevcut dosyayı yükle (grammar.json)
      const grammarData = require('../../assets/data/grammar/grammar.json');
      const grammar: Grammar[] = grammarData;
      return level 
        ? grammar.filter((g: Grammar) => g.level === level)
        : grammar;
    } catch (error) {
      // Dosya yoksa boş döndür
      return [];
    }
  }


  // Cümleleri seviyeye göre yükle (7k Sentences formatından)
  static async loadSentencesByLevel(level: 'A1' | 'A2' | 'B1' | 'B2', count?: number): Promise<Sentence[]> {
    try {
      // Önce yeni dosya adını dene, sonra eski dosya adlarını dene
      let sentencesData;
      try {
        sentencesData = require('../../assets/data/german_sentences/sentences_7k.json');
      } catch (e) {
        try {
          sentencesData = require('../../assets/data/german_sentences/german_7k_sentences_final.json');
        } catch (e2) {
          try {
            sentencesData = require('../../assets/data/sentences/german_7k_sentences_final.json');
          } catch (e3) {
            console.error(`Error loading sentences for ${level}:`, e3);
            return [];
          }
        }
      }
      
      const filtered = sentencesData.filter((s: any) => s.level === level);
      const sentences = filtered.slice(0, count || filtered.length);
      return sentences.map((s: any) => ({
        ...s,
        practiced: s.practiced || false,
      }));
    } catch (error) {
      console.error(`Error loading sentences for ${level}:`, error);
      return [];
    }
  }
}

