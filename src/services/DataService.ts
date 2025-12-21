import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { getWordRank, calculatePriorityScore, sortByFrequency } from './FrequencyService';

// Bu servis JSON dosyalarını assets/data'dan okur

export class DataService {
  // Kelimeleri yükle (Langenscheidt formatı)
  static async loadVocabulary(level?: 'A1' | 'A2' | 'B1' | 'B2'): Promise<Vocabulary[]> {
    try {
      let vocabData;
      try {
        vocabData = require('../../assets/data/vocab_langenscheidt.json');
      } catch (requireError) {
        console.error('Error requiring vocabulary file:', requireError);
        return [];
      }
      
      // Güvenlik kontrolü: vocabData array olmalı
      if (!Array.isArray(vocabData)) {
        console.error('Vocabulary data is not an array');
        return [];
      }
      
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
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      return [];
    }
  }

  // Cümleleri yükle (7k Sentences formatı)
  static async loadSentences(count: number = 5, level?: 'A1' | 'A2' | 'B1' | 'B2'): Promise<Sentence[]> {
    try {
      let sentencesData;
      try {
        sentencesData = require('../../assets/data/german_sentences/sentences_7k.json');
      } catch (requireError) {
        console.error('Error requiring sentences file:', requireError);
        return [];
      }
      
      if (!Array.isArray(sentencesData) || sentencesData.length === 0) {
        console.error('DataService: Cümle dosyası geçersiz veya boş!');
        return [];
      }
      
      let sentences = sentencesData.map((s: any) => ({
        ...s,
        practiced: s.practiced || false,
      }));
      
      // Seviyeye göre filtrele
      if (level) {
        sentences = sentences.filter((s: Sentence) => s.level === level);
      }
      
      // İlk N tanesini al
      return sentences.slice(0, count);
    } catch (error) {
      console.error('Error loading sentences:', error);
      return [];
    }
  }

  // Cümleleri seviyeye göre yükle
  static async loadSentencesByLevel(level: 'A1' | 'A2' | 'B1' | 'B2', count?: number): Promise<Sentence[]> {
    try {
      const sentencesData = require('../../assets/data/german_sentences/sentences_7k.json');
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

