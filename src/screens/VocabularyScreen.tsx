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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DataService } from '../services/DataService';
import { StorageService } from '../services/StorageService';
import { ProgressService } from '../services/ProgressService';
import { Vocabulary } from '../models/Vocabulary';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80; // Swipe için minimum mesafe (daha hassas)
const SWIPE_VELOCITY = 0.3; // Swipe hızı (daha hassas)

export default function VocabularyScreen() {
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [wordsFinished, setWordsFinished] = useState(false);
  
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
      if (!currentLevel) return;
      
      const allWords = await DataService.loadVocabulary(currentLevel);
      const savedWords = await StorageService.getVocabulary();
      const today = new Date().toDateString();
      
      // Map kullanarak O(1) lookup için optimize et
      const savedWordsMap = new Map<string | number, Vocabulary>();
      savedWords.forEach(w => {
        const key = w.id || w.german || w.word;
        if (key) savedWordsMap.set(key, w);
      });
      
      // Bilinmeyen kelimeleri göster (henüz öğrenilmemiş)
      const mergedWords = allWords.map(word => {
        const identifier = word.german || word.word || word.id;
        const saved = identifier ? savedWordsMap.get(identifier) : null;
        return saved ? { ...word, ...saved } : word;
      }).filter(word => {
        // Sadece bilinmeyen kelimeler
        if (word.known) return false;
        
        // Günlük modda: Bugün görüntülenmemiş kelimeleri göster
        // Sınırsız modda: Tüm bilinmeyen kelimeleri göster (daily_reviewed_date filtresi yok)
        if (!showAll) {
          // Günlük mod: daily_reviewed_date bugün ise, bu kelime bugün zaten gösterilmiş
          if (word.daily_reviewed_date) {
            const reviewDate = new Date(word.daily_reviewed_date as string).toDateString();
            if (reviewDate === today) {
              return false; // Bugün zaten gösterilmiş, günlük modda tekrar gösterme
            }
          }
        }
        // Sınırsız modda: Tüm bilinmeyen kelimeleri göster (filtre yok)
        
        return true;
      });
      
      // Günlük modda ilk 10'u al, sınırsız modda hepsini göster
      const wordsToShow = showAll ? mergedWords : mergedWords.slice(0, 10);
      setWords(wordsToShow);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
      
      if (wordsToShow.length === 0) {
        setWordsFinished(true);
      }
    } catch (error) {
      console.error('Error loading words:', error);
    } finally {
      setLoading(false);
    }
  }, [currentLevel, showAll]);

  useEffect(() => {
    loadCurrentLevel();
  }, []);

  useEffect(() => {
    if (currentLevel) {
      loadWords();
      position.setValue({ x: 0, y: 0 });
    }
  }, [currentLevel, showAll, loadWords]);

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
          return nextIndex;
        } else {
          // Kelimeler bitti, mesaj göster
          setWordsFinished(true);
          return currentWordsAfter.length; // Index'i son kelimeden sonra tut
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


  const levelColors: Record<string, string> = {
    A1: Colors.levelA1,
    A2: Colors.levelA2,
    B1: Colors.levelB1,
    B2: Colors.levelB2,
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // Güvenli kontroller
  if (!words || words.length === 0 || wordsFinished || currentIndex >= words.length) {
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, showAll && styles.toggleButtonActive]}
              onPress={() => {
                setShowAll(!showAll);
                setWordsFinished(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleButtonText, showAll && styles.toggleButtonTextActive]}>
                {showAll ? '📚 Sınırsız' : '📖 Günlük (10)'}
              </Text>
            </TouchableOpacity>
          </View>
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
              ? showAll 
                ? '🎉 Tüm bilinmeyen kelimeleri tamamladın!'
                : '🎉 Günlük kelimeleri tamamladın!\n\nTest kısmından tekrar edebilirsin veya sınırsız moda geçebilirsin.'
              : 'Bu seviye için kelime bulunamadı.'}
          </Text>
          {wordsFinished && !showAll && (
            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => {
                setShowAll(true);
                setWordsFinished(false);
                loadWords();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.switchModeButtonGradient}
              >
                <Text style={styles.switchModeButtonText}>📚 Sınırsız Moda Geç</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
  
  // Güvenli currentWord kontrolü
  if (!words || words.length === 0 || currentIndex >= words.length) {
    return null;
  }
  
  const currentWord = words[currentIndex];
  if (!currentWord || !currentWord.level) {
    return null;
  }
  
  const levelColor = levelColors[currentWord.level] || Colors.primary;

  return (
    <View style={styles.container}>
      {/* Kontroller - Sadece Sınırsız/Günlük */}
      <View style={styles.controls}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, showAll && styles.toggleButtonActive]}
            onPress={() => setShowAll(!showAll)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleButtonText, showAll && styles.toggleButtonTextActive]}>
              {showAll ? '📚 Sınırsız' : '📖 Günlük (10)'}
            </Text>
          </TouchableOpacity>
        </View>
        {currentLevel && levelColors[currentLevel] && (
          <View style={styles.levelIndicator}>
            <Text style={styles.levelIndicatorText}>
              Seviye: <Text style={[styles.levelIndicatorLevel, { color: levelColors[currentLevel] }]}>{currentLevel}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* İlerleme */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>İlerleme</Text>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {words.length}
          </Text>
        </View>
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
          <View style={styles.cardContent}>
            {/* Normal Mode: Her ikisi de göster */}
            <View style={styles.wordSection}>
              <View style={styles.wordContainer}>
                {currentWord.article && (
                  <Text style={styles.article}>{currentWord.article}</Text>
                )}
                <Text 
                  style={styles.word}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}
                >
                  {currentWord.german || currentWord.word}
                </Text>
              </View>
            </View>
            
            <View style={styles.meaningSection}>
              <Text style={styles.meaning} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                {currentWord.english || currentWord.meaning_tr}
              </Text>
            </View>
            
            {currentWord.example_sentence && (
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleLabel}>💡 Örnek</Text>
                <Text style={styles.exampleDE} numberOfLines={2}>{currentWord.example_sentence}</Text>
                {currentWord.example_translation && (
                  <Text style={styles.exampleEN} numberOfLines={1}>{currentWord.example_translation}</Text>
                )}
              </View>
            )}
            
            <View style={styles.wordInfo}>
              <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
                <Text style={[styles.levelText, { color: levelColor }]}>
                  {currentWord.level}
                </Text>
              </View>
              {currentWord.known && (
                <View style={[styles.knownBadge, { backgroundColor: Colors.success + '20' }]}>
                  <Text style={styles.knownText}>✓ Öğrenildi</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Navigasyon - Sadece geri gitme için */}
      {currentIndex > 0 && (
        <View style={styles.navigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
                position.setValue({ x: 0, y: 0 });
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>← Geri</Text>
          </TouchableOpacity>
        </View>
      )}
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
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  wordSection: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  word: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    flex: 1,
    minWidth: 0,
  },
  article: {
    fontSize: 18,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  meaningSection: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  meaning: {
    fontSize: 24,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 32,
    width: '100%',
  },
  exampleContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    width: '100%',
  },
  exampleLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: '700',
  },
  exampleDE: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  exampleEN: {
    ...Typography.caption,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  wordInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  levelText: {
    ...Typography.caption,
    fontWeight: '700',
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
  navigation: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  navButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  navButtonText: {
    ...Typography.bodySmall,
    color: Colors.primary,
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
