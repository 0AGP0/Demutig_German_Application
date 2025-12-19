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
import { AudioService } from '../services/AudioService';
import { Sentence } from '../models/Sentence';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 0.3;

export default function SentencesScreen() {
  const insets = useSafeAreaInsets();
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentencesFinished, setSentencesFinished] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false); // Flashcard modu: çeviri gizli/göster
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);
  
  // Animasyon değerleri
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
  const cardBackgroundColor = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2, SCREEN_WIDTH],
    outputRange: [
      'rgba(255, 59, 48, 0.3)',
      'rgba(255, 59, 48, 0.15)',
      Colors.card,
      'rgba(88, 204, 2, 0.15)',
      'rgba(88, 204, 2, 0.3)',
    ],
  });

  // useRef ile currentIndex'i takip et
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const sentencesRef = useRef(sentences);
  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    loadCurrentLevel();
  }, []);

  // Component unmount olduğunda sesi durdur
  useEffect(() => {
    return () => {
      AudioService.stop();
    };
  }, []);


  const loadCurrentLevel = async () => {
    try {
      const progress = await ProgressService.calculateProgress();
      setCurrentLevel(progress.current_level);
    } catch (error) {
      console.error('Error loading current level:', error);
      setCurrentLevel('A1');
    }
  };

  const loadSentences = useCallback(async () => {
    try {
      setLoading(true);
      setSentencesFinished(false);
      if (!currentLevel) return;
      
      // Erişilebilen tüm seviyeleri belirle (currentLevel ve altındaki tüm seviyeler)
      const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
      const currentLevelIndex = allLevels.indexOf(currentLevel);
      const accessibleLevels = allLevels.slice(0, currentLevelIndex + 1);
      
      console.log('SentencesScreen: Cümleler yükleniyor, erişilebilen seviyeler:', accessibleLevels);
      
      // Tüm erişilebilen seviyelerden cümleleri yükle
      const allSentences: Sentence[] = [];
      for (const level of accessibleLevels) {
        const levelSentences = await DataService.loadSentences(1000, level);
        allSentences.push(...levelSentences);
      }
      
      console.log('SentencesScreen: Yüklenen toplam cümle sayısı:', allSentences.length);
      
      const savedSentences = await StorageService.getSentences();
      const now = new Date();
      
      // Map kullanarak O(1) lookup için optimize et
      const savedSentencesMap = new Map<number, Sentence>();
      savedSentences.forEach(s => {
        if (s.id) savedSentencesMap.set(s.id, s);
      });
      
      // ID'leri kontrol et ve merge et
      const mergedSentences = allSentences
        .map((sentence, index) => {
          // ID yoksa index kullan
          if (!sentence.id) {
            sentence.id = index + 1000;
          }
          
          // İçerik kontrolü
          const sentenceAny = sentence as any;
          const hasContent = !!(sentence.german_sentence || sentence.de || sentenceAny.text_de);
          if (!hasContent) {
            return null;
          }
          
          // Reading formatını Sentence formatına çevir
          if (sentenceAny.text_de && !sentence.german_sentence) {
            sentence.german_sentence = sentenceAny.text_de;
            sentence.english_translation = sentenceAny.text_tr || sentence.english_translation;
          }
          
          // Saved sentences'den bilgileri al
          const saved = sentence.id ? savedSentencesMap.get(sentence.id) : null;
          const merged = saved ? {
            ...sentence,
            practiced: saved.practiced || false,
            practiced_date: saved.practiced_date,
            daily_reviewed_date: saved.daily_reviewed_date,
            practicedCount: saved.practicedCount,
            status: saved.status,
          } : sentence;
          
          // Status hesapla (eğer yoksa)
          if (!merged.status) {
            const practicedCount = merged.practicedCount || 0;
            if (practicedCount >= 2) {
              merged.status = 'mastered';
            } else if (practicedCount === 1 || merged.practiced_date) {
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
        })
        .filter((s): s is Sentence => {
          if (!s) return false;
          const sAny = s as any;
          return !!(s.german_sentence || s.de || sAny.text_de);
        });
      
      // Öncelik sırasına göre filtrele ve sırala: review → learning → new
      const reviewSentences = mergedSentences.filter(s => s.status === 'review');
      const learningSentences = mergedSentences.filter(s => s.status === 'learning');
      const newSentences = mergedSentences.filter(s => s.status === 'new');
      
      // Sıralama: review → learning → new
      const sentencesToShow = [...reviewSentences, ...learningSentences, ...newSentences];
      
      // Boş image_path ve audio_path'leri temizle
      sentencesToShow.forEach(sentence => {
        if (sentence.image_path && (!sentence.image_path.trim() || sentence.image_path === '""' || sentence.image_path === '""')) {
          sentence.image_path = null;
        }
        if (sentence.audio_path && (!sentence.audio_path.trim() || sentence.audio_path === '""' || sentence.audio_path === '""')) {
          sentence.audio_path = null;
        }
      });
      
      setSentences(sentencesToShow);
      
      // Kaydedilmiş index'i geri yükle
      const savedIndex = await StorageService.getSentencesLastIndex();
      const validIndex = savedIndex < sentencesToShow.length ? savedIndex : 0;
      setCurrentIndex(validIndex);
      setShowMeaning(false); // Yeni cümle için çeviriyi gizle
      position.setValue({ x: 0, y: 0 });
      
      if (sentencesToShow.length === 0) {
        setSentencesFinished(true);
      }
    } catch (error) {
      console.error('Error loading sentences:', error);
    } finally {
      setLoading(false);
    }
  }, [currentLevel]);

  useEffect(() => {
    if (currentLevel) {
      loadSentences();
      position.setValue({ x: 0, y: 0 });
    }
  }, [currentLevel, loadSentences]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const currentSentenceIndex = currentIndexRef.current;
    const currentSentences = sentencesRef.current;
    
    if (!currentSentences[currentSentenceIndex]) {
      console.log('No sentence at index:', currentSentenceIndex);
      return;
    }

    const sentence = currentSentences[currentSentenceIndex];
    const sentenceId = sentence.id;
    
    if (!sentenceId) {
      console.warn('Sentence ID is missing');
      return;
    }
    
    // Sağa = Biliyorum (practiced: true), Sola = Bilmiyorum (practiced: false)
    const practiced = direction === 'right';
    
    try {
      await StorageService.markSentencePracticed(sentenceId, practiced, sentence);
    } catch (error) {
      console.error('Error marking sentence practiced:', error);
    }
    
    // Animasyon ile kartı kaydır
    Animated.timing(position, {
      toValue: { x: direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      // Animasyon bitti, sonraki cümleye geç
      position.setValue({ x: 0, y: 0 });
      
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        const currentSentencesAfter = sentencesRef.current;
        
        if (nextIndex < currentSentencesAfter.length) {
          // Sonraki cümle var - index'i kaydet
          StorageService.saveSentencesLastIndex(nextIndex);
          setShowMeaning(false); // Yeni cümle için çeviriyi gizle
          return nextIndex;
        } else {
          // Cümleler bitti - index'i sıfırla
          StorageService.saveSentencesLastIndex(0);
          setSentencesFinished(true);
          return currentSentencesAfter.length;
        }
      });
    });
  }, [position]);

  // panResponder'ı handleSwipe değiştiğinde yeniden oluştur
  const panResponder = useRef<any>(null);

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


  const playAudio = async (audioPath: string, sentenceId: number) => {
    try {
      // Eğer aynı cümleyi tekrar çalıyorsak, sadece durdur
      if (currentPlayingId === sentenceId && isPlaying) {
        AudioService.stop();
        setIsPlaying(false);
        setCurrentPlayingId(null);
        return;
      }

      setIsPlaying(true);
      setCurrentPlayingId(sentenceId);
      
      const success = await AudioService.playAudio(audioPath, `sentence_${sentenceId}`);
      
      if (!success) {
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
      console.error('❌ Error in playAudio:', error);
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

  if (!sentences || sentences.length === 0 || sentencesFinished || currentIndex >= sentences.length) {
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
            {sentencesFinished 
              ? '🎉 Tüm cümleleri tamamladın!'
              : 'Bu seviye için cümle bulunamadı.'}
          </Text>
        </View>
      </View>
    );
  }
  
  if (!sentences || sentences.length === 0 || currentIndex >= sentences.length) {
    return null;
  }
  
  const currentSentence = sentences[currentIndex];
  if (!currentSentence || !currentSentence.level) {
    return null;
  }
  
  const levelColor = levelColors[currentSentence.level] || Colors.primary;
  const germanText = currentSentence.german_sentence || currentSentence.de;
  const englishText = currentSentence.english_translation || currentSentence.tr || currentSentence.en;

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

      {/* İlerleme */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>İlerleme</Text>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {sentences.length}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={[Colors.info, Colors.infoLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / sentences.length) * 100}%` },
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

      {/* Ana Cümle Kartı - Swipe edilebilir */}
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
                      {currentSentence.level}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    {currentSentence.practicedCount && currentSentence.practicedCount >= 2 && (
                      <View style={styles.masteredBadge}>
                        <Text style={styles.masteredText}>⭐ Mastered</Text>
                      </View>
                    )}
                    {/* Audio Button - Sağ Üst Köşe */}
                    {currentSentence.audio_path && (
                      <TouchableOpacity
                        style={styles.audioButtonTop}
                        onPress={() => currentSentence.audio_path && currentSentence.id && playAudio(currentSentence.audio_path, currentSentence.id)}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={currentPlayingId === currentSentence.id && isPlaying 
                            ? [Colors.success, Colors.successLight]
                            : [Colors.success, Colors.successLight]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.audioButtonGradientTop}
                        >
                          <Text style={styles.audioButtonTextTop}>
                            {currentPlayingId === currentSentence.id && isPlaying ? '⏸️' : '🎵'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Main Sentence - Large & Bold */}
                <View style={styles.sentenceSection}>
                  <Text style={styles.sentenceDE} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {germanText}
                  </Text>
                </View>
                
                {/* Image Section */}
                {currentSentence.image_path && 
                 currentSentence.image_path !== '""' && 
                 currentSentence.image_path.trim() && 
                 currentSentence.image_path.trim().length > 0 && (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ 
                        uri: __DEV__ 
                          ? `http://localhost:8081/assets/images/${encodeURIComponent(currentSentence.image_path.trim())}`
                          : `asset:/images/${currentSentence.image_path.trim()}`
                      }}
                      style={styles.sentenceImage}
                      resizeMode="contain"
                      onError={(error) => {
                        console.log('Image load error:', error.nativeEvent.error);
                      }}
                    />
                  </View>
                )}
                
                {/* Translation Section */}
                {showMeaning ? (
                  englishText && (
                    <View style={styles.meaningSection}>
                      <View style={styles.meaningCard}>
                        <Text style={styles.meaningLabel}>Çeviri</Text>
                        <Text style={styles.meaning} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {englishText}
                        </Text>
                      </View>
                    </View>
                  )
                ) : (
                  <View style={styles.meaningSection}>
                    <View style={styles.hintCard}>
                      <Text style={styles.hintIcon}>👆</Text>
                      <Text style={styles.hintText}>Dokunarak çeviriyi gör</Text>
                    </View>
                  </View>
                )}
                
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Navigasyon */}
      {currentIndex > 0 && (
        <View style={styles.navigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              if (currentIndex > 0) {
                const newIndex = currentIndex - 1;
                setCurrentIndex(newIndex);
                StorageService.saveSentencesLastIndex(newIndex);
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
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
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
    gap: Spacing.md,
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
  sentenceSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  sentenceDE: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.6,
    width: '100%',
  },
  meaningSection: {
    marginVertical: Spacing.lg,
    width: '100%',
  },
  meaningCard: {
    backgroundColor: Colors.info + '15',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.info + '30',
  },
  meaningLabel: {
    ...Typography.caption,
    color: Colors.info,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  meaning: {
    fontSize: 24,
    color: Colors.info,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 32,
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
  sentenceImage: {
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
  revealButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.colored,
  },
  revealButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minWidth: 180,
  },
  revealButtonText: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  audioButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.colored,
  },
  audioButtonGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonText: {
    fontSize: 32,
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
  practicedBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  practicedText: {
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
