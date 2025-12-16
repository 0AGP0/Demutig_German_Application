import { Vocabulary } from '../models/Vocabulary';

interface FrequencyData {
  word: string;
  frequency: number;
  rank: number;
}

let frequencyData: FrequencyData[] | null = null;

// FrequencyWords verisini yükle
export function loadFrequencyData(): FrequencyData[] {
  if (frequencyData) {
    return frequencyData;
  }
  
  try {
    const data = require('../../assets/data/frequency/frequency.json');
    frequencyData = data;
    return data;
  } catch (error) {
    console.warn('Frequency data not found, using empty array');
    return [];
  }
}

// Kelimeye göre sıklık bul
export function getWordFrequency(word: string): number {
  const data = loadFrequencyData();
  const found = data.find(item => item.word.toLowerCase() === word.toLowerCase());
  return found ? found.frequency : 0;
}

// Kelimeye göre sıralama bul
export function getWordRank(word: string): number {
  const data = loadFrequencyData();
  const found = data.find(item => item.word.toLowerCase() === word.toLowerCase());
  return found ? found.rank : 999999;
}

// Kelimeleri sıklığa göre sırala
export function sortByFrequency(words: Vocabulary[]): Vocabulary[] {
  const data = loadFrequencyData();
  const frequencyMap = new Map<string, number>();
  
  data.forEach(item => {
    frequencyMap.set(item.word.toLowerCase(), item.frequency);
  });
  
  return [...words].sort((a, b) => {
    const wordA = a.word || a.german || '';
    const wordB = b.word || b.german || '';
    const freqA = wordA ? (frequencyMap.get(wordA.toLowerCase()) || 0) : 0;
    const freqB = wordB ? (frequencyMap.get(wordB.toLowerCase()) || 0) : 0;
    return freqB - freqA; // Yüksek sıklık önce
  });
}

// En önemli kelimeleri getir (bilinmeyenler arasından)
export function getTopPriorityWords(
  allWords: Vocabulary[],
  knownWords: Set<string>,
  count: number = 10
): Vocabulary[] {
  // Bilinmeyen kelimeleri filtrele
  const unknown = allWords.filter(w => {
    const word = w.word || w.german;
    return word ? !knownWords.has(word) : false;
  });
  
  // Sıklığa göre sırala
  const sorted = sortByFrequency(unknown);
  
  // İlk N tanesini al
  return sorted.slice(0, count);
}

// Kelime öncelik skoru hesapla (sıklık + seviye)
export function calculatePriorityScore(word: Vocabulary): number {
  const wordText = word.word || word.german || '';
  if (!wordText) return 0;
  
  const frequency = getWordFrequency(wordText);
  const rank = getWordRank(wordText);
  
  // Seviye ağırlıkları (A1 daha önemli)
  const levelWeights: { [key: string]: number } = {
    A1: 100,
    A2: 80,
    B1: 60,
    B2: 40,
  };
  
  const levelWeight = levelWeights[word.level] || 50;
  
  // Sıklık skoru (rank tersine çevrilmiş, yüksek sıklık = düşük rank = yüksek skor)
  const frequencyScore = rank > 0 ? (100000 / rank) : 0;
  
  return frequencyScore * 0.7 + levelWeight * 0.3;
}






