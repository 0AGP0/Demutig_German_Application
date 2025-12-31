import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DataService } from '../services/DataService';
import { StorageService } from '../services/StorageService';
import { ProgressService } from '../services/ProgressService';
import { TestService, TestMode } from '../services/TestService';
import { AudioService } from '../services/AudioService';
import { Vocabulary } from '../models/Vocabulary';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80; // Swipe için minimum mesafe (daha hassas)
const SWIPE_VELOCITY = 0.3; // Swipe hızı (daha hassas)

export default function VocabularyScreen() {
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordsFinished, setWordsFinished] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false); // Flashcard modu: anlam gizli/göster
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<number | string | null>(null);
  
  // Animasyon değerleri - useRef ile sakla
  const position = useRef(new Animated.ValueXY()).current;
  const rotateCard = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
  });
  const opacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0.5, 1, 0.5],
  });
  const borderColor = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [Colors.error, Colors.border, Colors.success],
  });
  // Kart arka plan rengi - swipe yönüne göre
  const cardBackgroundColor = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2, SCREEN_WIDTH],
    outputRange: [
      'rgba(255, 59, 48, 0.3)', // Kırmızı (sola)
      'rgba(255, 59, 48, 0.15)',
      Colors.card, // Normal
      'rgba(88, 204, 2, 0.15)',
      'rgba(88, 204, 2, 0.3)', // Yeşil (sağa)
    ],
  });

  const loadCurrentLevel = async () => {
    try {
      const progress = await ProgressService.calculateProgress();
      setCurrentLevel(progress.current_level);
    } catch (error) {
      console.error('Error loading current level:', error);
      setCurrentLevel('A1');
    }
  };

  // panResponder - handleSwipe'den sonra oluşturulacak
  const panResponder = useRef<any>(null);

  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      setWordsFinished(false);
      if (!currentLevel) {
        console.log('VocabularyScreen: currentLevel yok, kelimeler yüklenmiyor');
        return;
      }
      
      // Erişilebilen tüm seviyeleri belirle (currentLevel ve altındaki tüm seviyeler)
      const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
      const currentLevelIndex = allLevels.indexOf(currentLevel);
      const accessibleLevels = allLevels.slice(0, currentLevelIndex + 1);
      
      console.log('VocabularyScreen: Kelimeler yükleniyor, erişilebilen seviyeler:', accessibleLevels);
      
      // Tüm erişilebilen seviyelerden kelimeleri yükle
      const allWords: Vocabulary[] = [];
      for (const level of accessibleLevels) {
        const levelWords = await DataService.loadVocabulary(level);
        allWords.push(...levelWords);
      }
      
      console.log('VocabularyScreen: Yüklenen toplam kelime sayısı:', allWords.length);
      const savedWords = await StorageService.getVocabulary();
      console.log('VocabularyScreen: Kaydedilmiş kelime sayısı:', savedWords.length);
      const now = new Date();
      
      // Map kullanarak O(1) lookup için optimize et
      const savedWordsMap = new Map<string | number, Vocabulary>();
      savedWords.forEach(w => {
        const key = w.id || w.german || w.word;
        if (key) savedWordsMap.set(key, w);
      });
      
      // Merge et ve status hesapla
      const mergedWords = allWords.map(word => {
        const identifier = word.german || word.word || word.id;
        const saved = identifier ? savedWordsMap.get(identifier) : null;
        const merged = saved ? { ...word, ...saved } : word;
        
        // Status hesapla (eğer yoksa)
        if (!merged.status) {
          const knownCount = merged.knownCount || 0;
          if (knownCount >= 3) {
            merged.status = 'mastered';
          } else if (knownCount >= 1 || merged.last_reviewed) {
            merged.status = 'learning';
          } else {
            merged.status = 'new';
          }
        }
        
        // Review kontrolü
        if (merged.status === 'mastered' && merged.next_review_date) {
          const reviewDate = new Date(merged.next_review_date);
          if (reviewDate <= now) {
            merged.status = 'review';
          }
        } else if (merged.status === 'learning' && merged.next_review_date) {
          const reviewDate = new Date(merged.next_review_date);
          if (reviewDate <= now) {
            merged.status = 'review';
          }
        }
        
        return merged;
      });
      
      // Filtrele: Sadece review (tekrar zamanı gelmiş) + yeni kelimeler göster
      // Learning ve mastered kelimeleri tekrar zamanı gelene kadar gösterme (spaced repetition)
      const reviewWords = mergedWords.filter(w => w.status === 'review');
      const newWords = mergedWords.filter(w => w.status === 'new');
      const learningWords = mergedWords.filter(w => w.status === 'learning');
      const masteredWords = mergedWords.filter(w => w.status === 'mastered');
      
      // Sıralama: review → new (SABİT, random değil - index tutmak için)
      const wordsToShow = [...reviewWords, ...newWords];
      
      console.log('📊 VocabularyScreen İstatistikler:');
      console.log('   Gösterilecek:', wordsToShow.length, '(Review:', reviewWords.length, '+ New:', newWords.length + ')');
      console.log('   Bekleme Süresinde:', learningWords.length + masteredWords.length, '(Learning:', learningWords.length, '+ Mastered:', masteredWords.length + ')');
      console.log('   Toplam Yüklenen:', mergedWords.length);
      
      // İlk 3 learning kelimeyi detaylı göster (debug için)
      if (learningWords.length > 0) {
        console.log('📝 İlk 3 Learning Kelime (Tekrar Bekliyor):');
        learningWords.slice(0, 3).forEach(w => {
          const reviewDate = w.next_review_date ? new Date(w.next_review_date) : null;
          const hoursUntil = reviewDate ? Math.round((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60)) : null;
          console.log(`   - ${w.german}: next_review = ${reviewDate?.toLocaleString('tr-TR') || 'yok'} (${hoursUntil} saat sonra)`);
        });
      }
      
      // Boş image_path'leri temizle
      wordsToShow.forEach(word => {
        if (word.image_path && (!word.image_path.trim() || word.image_path === '""' || word.image_path === '""')) {
          word.image_path = null;
        }
        if (word.audio_path && (!word.audio_path.trim() || word.audio_path === '""' || word.audio_path === '""')) {
          word.audio_path = null;
        }
      });
      
      setWords(wordsToShow);
      
      // Son görülen kelimeyi bul ve oradan devam et
      const lastSeenWord = await StorageService.getLastSeenWord();
      let startIndex = 0;
      
      if (lastSeenWord && wordsToShow.length > 0) {
        // Son görülen kelimeyi listede bul
        const foundIndex = wordsToShow.findIndex(w => {
          const identifier = String(w.id || w.german || w.word);
          return identifier === lastSeenWord;
        });
        
        if (foundIndex !== -1) {
          // Kelime bulundu - bir sonraki kelimeden devam et
          startIndex = foundIndex + 1;
          console.log('✅ Son görülen kelime bulundu! Index:', foundIndex, '→ Devam:', startIndex);
        } else {
          console.log('⚠️ Son görülen kelime listede yok, baştan başla');
        }
      }
      
      // Listede kelime kalmadıysa başa dön
      if (startIndex >= wordsToShow.length) {
        startIndex = 0;
      }
      
      setCurrentIndex(startIndex);
      setShowMeaning(false);
      position.setValue({ x: 0, y: 0 });
      
      if (wordsToShow.length === 0) {
        console.log('VocabularyScreen: Hiç kelime bulunamadı!');
        setWordsFinished(true);
      }
    } catch (error) {
      console.error('VocabularyScreen: Error loading words:', error);
      console.error('VocabularyScreen: Error details:', error);
      setWords([]);
      setWordsFinished(true);
    } finally {
      setLoading(false);
    }
  }, [currentLevel]);

  useEffect(() => {
    loadCurrentLevel();
  }, []);

  // Component unmount olduğunda sesi durdur
  useEffect(() => {
    return () => {
      AudioService.stop();
    };
  }, []);

  useEffect(() => {
    if (currentLevel) {
      loadWords();
      position.setValue({ x: 0, y: 0 });
    }
  }, [currentLevel, loadWords]);

  // useRef ile currentIndex'i takip et - closure sorununu çöz
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const currentWordIndex = currentIndexRef.current;
    const currentWords = wordsRef.current;
    
    if (!currentWords[currentWordIndex]) {
      console.log('No word at index:', currentWordIndex);
      return;
    }

    const word = currentWords[currentWordIndex];
    const identifier = word.id || word.german || word.word;
    
    if (!identifier) {
      console.warn('Word identifier is missing');
      return;
    }
    
    // Önce state'i güncelle - wordData'yı da gönder ki yeni kelime ise eklenebilsin
    // VocabularyScreen'de swipe edildiğinde daily_reviewed_date hemen set edilmeli
    try {
      if (direction === 'right') {
        // Sağa = Biliyorum (Yeşil)
        await StorageService.updateVocabularyStatus(identifier, true, word);
      } else {
        // Sola = Bilmiyorum (Kırmızı)
        await StorageService.updateVocabularyStatus(identifier, false, word);
      }
      
      // Son görülen kelimeyi kaydet
      await StorageService.saveLastSeenWord(identifier);
    } catch (error) {
      console.error('Error updating vocabulary status:', error);
    }
    
    // Animasyon ile kartı kaydır
    Animated.timing(position, {
      toValue: { x: direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      // Animasyon bitti, sonraki kelimeye geç
      position.setValue({ x: 0, y: 0 });
      
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        const currentWordsAfter = wordsRef.current;
        
        if (nextIndex < currentWordsAfter.length) {
          // Sonraki kelime var
          setShowMeaning(false);
          return nextIndex;
        } else {
          // Kelimeler bitti
          setWordsFinished(true);
          return currentWordsAfter.length;
        }
      });
    });
  }, [position]);

  // panResponder'ı handleSwipe değiştiğinde yeniden oluştur
  useEffect(() => {
    if (!handleSwipe) return;
    
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeDistance = Math.abs(gestureState.dx);
        const swipeVelocity = Math.abs(gestureState.vx);
        
        if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > SWIPE_VELOCITY) {
          if (gestureState.dx > 0) {
            handleSwipe('right');
          } else {
            handleSwipe('left');
          }
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }).start();
        }
      },
    });
  }, [handleSwipe, position]);

  const playAudio = async (audioPath: string, wordId: number | string) => {
    try {
      console.log('🎵 VocabularyScreen.playAudio çağrıldı:', { audioPath, wordId });
      
      // Eğer aynı kelimeyi tekrar çalıyorsak, sadece durdur
      if (currentPlayingId === wordId && isPlaying) {
        console.log('🛑 Aynı kelime çalıyor, durduruluyor');
        AudioService.stop();
        setIsPlaying(false);
        setCurrentPlayingId(null);
        return;
      }

      console.log('▶️ Ses çalmaya başlanıyor...');
      setIsPlaying(true);
      setCurrentPlayingId(wordId);
      
      // ID'yi string'e çevir (number ise string'e çevir)
      const wordIdStr = String(wordId);
      const success = await AudioService.playAudio(audioPath, `word_${wordIdStr}`);
      console.log('🎵 AudioService.playAudio sonucu:', success);
      
      if (!success) {
        console.error('❌ Ses çalma başarısız!');
        setIsPlaying(false);
        setCurrentPlayingId(null);
      } else {
        // Ses çalma tamamlandığında state'i güncelle
        // AudioService içinde zaten temizlik yapılıyor
        setTimeout(() => {
          setIsPlaying(false);
          setCurrentPlayingId(null);
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error in VocabularyScreen.playAudio:', error);
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };

  const levelColors: Record<string, string> = {
    A1: Colors.levelA1,
    A2: Colors.levelA2,
    B1: Colors.levelB1,
    B2: Colors.levelB2,
  };

  // Güvenli kontroller
  if (!words || words.length === 0 || wordsFinished || currentIndex >= words.length) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.controls}>
          {currentLevel && levelColors[currentLevel] && (
            <View style={styles.levelIndicator}>
              <Text style={styles.levelIndicatorText}>
                Seviye: <Text style={[styles.levelIndicatorLevel, { color: levelColors[currentLevel] }]}>{currentLevel}</Text>
              </Text>
            </View>
          )}
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {wordsFinished 
              ? '🎉 Tüm kelimeleri tamamladın!'
              : 'Bu seviye için kelime bulunamadı.'}
          </Text>
        </View>
      </View>
    );
  }
  
  // Güvenli currentWord kontrolü
  if (!words || words.length === 0 || currentIndex >= words.length) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Kelime yükleniyor...</Text>
        </View>
      </View>
    );
  }
  
  const currentWord = words[currentIndex];
  if (!currentWord) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Kelime bulunamadı.</Text>
        </View>
      </View>
    );
  }
  
  // Level kontrolü - eğer level yoksa varsayılan değer kullan
  const wordLevel = currentWord.level || currentLevel || 'A1';
  const levelColor = levelColors[wordLevel] || Colors.primary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Kontroller */}
      <View style={styles.controls}>
        {currentLevel && levelColors[currentLevel] && (
          <View style={styles.levelIndicator}>
            <Text style={styles.levelIndicatorText}>
              Seviye: <Text style={[styles.levelIndicatorLevel, { color: levelColors[currentLevel] }]}>{currentLevel}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* İlerleme Bar - Sadece bar göster, sayı yok */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / words.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Swipe İpuçları */}
      <View style={styles.swipeHints}>
        <View style={styles.swipeHintLeft}>
          <Text style={styles.swipeHintText}>← Bilmiyorum</Text>
        </View>
        <View style={styles.swipeHintRight}>
          <Text style={styles.swipeHintText}>Biliyorum →</Text>
        </View>
      </View>

      {/* Ana Kelime Kartı - Swipe edilebilir */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotateCard },
              ],
              opacity: opacity,
              borderColor: borderColor as any,
              borderWidth: 3,
              backgroundColor: cardBackgroundColor as any,
            },
          ]}
          {...(panResponder.current?.panHandlers || {})}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowMeaning(!showMeaning)}
            style={styles.cardContent}
          >
            {/* Modern Card Design with Color Accents */}
            <View style={styles.cardWrapper}>
              {/* Color Accent Bar */}
              <View style={[styles.colorAccent, { backgroundColor: levelColor }]} />
              
              <View style={styles.cardBody}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={[styles.levelBadge, { backgroundColor: levelColor + '20', borderColor: levelColor }]}>
                    <Text style={[styles.levelText, { color: levelColor }]}>
                      {wordLevel}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    {currentWord.knownCount && currentWord.knownCount >= 3 && (
                      <View style={styles.masteredBadge}>
                        <Text style={styles.masteredText}>⭐ Mastered</Text>
                      </View>
                    )}
                    {/* Audio Button - Sağ Üst Köşe */}
                    {currentWord.audio_path && (
                      <TouchableOpacity
                        style={styles.audioButtonTop}
                        onPress={() => {
                          console.log('🎵 VocabularyScreen: Ses butonu basıldı');
                          console.log('🎵 currentWord:', {
                            id: currentWord.id,
                            german: currentWord.german,
                            word: currentWord.word,
                            audio_path: currentWord.audio_path
                          });
                          
                          if (!currentWord.audio_path) {
                            console.error('❌ VocabularyScreen: audio_path eksik!');
                            return;
                          }
                          
                          // ID için fallback: id varsa id, yoksa german veya word kullan
                          const wordId = currentWord.id || currentWord.german || currentWord.word;
                          if (!wordId) {
                            console.error('❌ VocabularyScreen: ID/german/word eksik!');
                            return;
                          }
                          
                          playAudio(currentWord.audio_path, wordId);
                        }}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={(() => {
                            const wordId = currentWord.id || currentWord.german || currentWord.word;
                            return currentPlayingId === wordId && isPlaying 
                              ? [Colors.success, Colors.successLight]
                              : [Colors.success, Colors.successLight];
                          })()}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.audioButtonGradientTop}
                        >
                          <Text style={styles.audioButtonTextTop}>
                            {(() => {
                              const wordId = currentWord.id || currentWord.german || currentWord.word;
                              return currentPlayingId === wordId && isPlaying ? '⏸️' : '🎵';
                            })()}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Main Word - Large & Bold */}
                <View style={styles.wordSection}>
                  {currentWord.article && (
                    <Text style={styles.article}>{currentWord.article}</Text>
                  )}
                  <Text 
                    style={styles.word}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {currentWord.german || currentWord.word}
                  </Text>
                </View>
                
                {/* Image Section */}
                {currentWord.image_path && 
                 currentWord.image_path !== '""' && 
                 currentWord.image_path.trim() && 
                 currentWord.image_path.trim().length > 0 && (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ 
                        uri: __DEV__ 
                          ? `http://localhost:8081/assets/images/${encodeURIComponent(currentWord.image_path.trim())}`
                          : `asset:/images/${currentWord.image_path.trim()}`
                      }}
                      style={styles.wordImage}
                      resizeMode="contain"
                      onError={(error) => {
                        console.log('Image load error:', error.nativeEvent.error);
                      }}
                    />
                  </View>
                )}

                {/* Meaning Section */}
                {showMeaning ? (
                  <View style={styles.meaningSection}>
                    <View style={styles.meaningCard}>
                      <Text style={styles.meaningLabel}>Anlam</Text>
                      <Text style={styles.meaning} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {currentWord.english || currentWord.meaning_tr}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.meaningSection}>
                    <View style={styles.hintCard}>
                      <Text style={styles.hintIcon}>👆</Text>
                      <Text style={styles.hintText}>Dokunarak anlamı gör</Text>
                    </View>
                  </View>
                )}
                
                {/* Example Sentence */}
                {currentWord.example_sentence && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleLabel}>💡 Örnek</Text>
                    <Text style={styles.exampleDE} numberOfLines={2}>
                      {currentWord.example_sentence}
                    </Text>
                    {currentWord.example_translation && showMeaning && (
                      <Text style={styles.exampleEN}>
                        {currentWord.example_translation}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  controls: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  levelIndicator: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  levelIndicatorText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  levelIndicatorLevel: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  toggleButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundTertiary,
  },
  toggleButtonActive: {
    backgroundColor: Colors.success,
  },
  toggleButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: Colors.textPrimary,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  // Swipe İpuçları
  swipeHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  swipeHintLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  swipeHintRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  swipeHintText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  // KART YAPISI
  cardContainer: {
    flex: 1,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    ...Shadows.large,
    justifyContent: 'center',
  },
  cardContent: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  cardWrapper: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 450,
  },
  colorAccent: {
    width: 6,
    borderRadius: BorderRadius.xl,
  },
  cardBody: {
    flex: 1,
    padding: Spacing.xxl,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  word: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -1.2,
    lineHeight: 60,
  },
  article: {
    fontSize: 24,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  meaningSection: {
    marginVertical: Spacing.lg,
    width: '100%',
  },
  meaningCard: {
    backgroundColor: Colors.primary + '15',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  meaningLabel: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  meaning: {
    fontSize: 26,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 34,
  },
  hintCard: {
    backgroundColor: Colors.backgroundTertiary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  hintIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  hintText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  imageContainer: {
    marginVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  wordImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundTertiary,
  },
  audioButtonTop: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.colored,
  },
  audioButtonGradientTop: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonTextTop: {
    fontSize: 24,
  },
  exampleContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  exampleLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: '700',
  },
  exampleDE: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  exampleEN: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  levelText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  masteredBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success + '20',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  masteredText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '700',
    fontSize: 11,
  },
  knownBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  knownText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.colored,
  },
  switchModeButtonGradient: {
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  switchModeButtonText: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});
