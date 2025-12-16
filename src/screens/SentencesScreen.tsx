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
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { DataService } from '../services/DataService';
import { StorageService } from '../services/StorageService';
import { ProgressService } from '../services/ProgressService';
import { Sentence } from '../models/Sentence';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 0.3;

export default function SentencesScreen() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [sentencesFinished, setSentencesFinished] = useState(false);
  const [recallMode, setRecallMode] = useState(false);
  const [showGerman, setShowGerman] = useState<{ [key: number]: boolean }>({});
  const [sound, setSound] = useState<Audio.Sound | null>(null);
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
    // Audio modunu ayarla
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  }, []);

  // Component unmount olduğunda sesi durdur
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);


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
      
      // Sadece mevcut seviyeden cümleleri yükle
      // Bir seviye bitmeden üst seviyenin cümleleri gelmesin
      const levelsToLoad: ('A1' | 'A2' | 'B1' | 'B2')[] = [currentLevel];
      
      // Tüm seviyelerden cümleleri yükle
      const allSentences: Sentence[] = [];
      for (const level of levelsToLoad) {
        const levelSentences = await DataService.loadSentences(1000, level);
        allSentences.push(...levelSentences);
      }
      
      const savedSentences = await StorageService.getSentences();
      const today = new Date().toDateString();
      
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
          if (saved) {
            return {
              ...sentence,
              practiced: saved.practiced || false,
              practiced_date: saved.practiced_date,
              daily_reviewed_date: saved.daily_reviewed_date,
            };
          }
          return sentence;
        })
        .filter((s): s is Sentence => {
          if (!s) return false;
          const sAny = s as any;
          return !!(s.german_sentence || s.de || sAny.text_de);
        })
        .filter(sentence => {
          // Sadece okunmamış cümleleri göster
          if (sentence.practiced) return false;
          
          // Günlük modda: Bugün görüntülenmemiş cümleleri göster
          if (!showAll) {
            if (sentence.daily_reviewed_date) {
              const reviewDate = new Date(sentence.daily_reviewed_date as string).toDateString();
              if (reviewDate === today) {
                return false; // Bugün zaten gösterilmiş
              }
            }
          }
          
          return true;
        });
      
      // Günlük modda ilk 5'i al, sınırsız modda hepsini göster
      const sentencesToShow = showAll ? mergedSentences : mergedSentences.slice(0, 5);
      setSentences(sentencesToShow);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
      
      if (sentencesToShow.length === 0) {
        setSentencesFinished(true);
      }
    } catch (error) {
      console.error('Error loading sentences:', error);
    } finally {
      setLoading(false);
    }
  }, [currentLevel, showAll]);

  useEffect(() => {
    if (currentLevel) {
      loadSentences();
      position.setValue({ x: 0, y: 0 });
    }
  }, [currentLevel, showAll, loadSentences]);

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
    
    // Sağa = Okudum/Bildim (practiced: true), Sola = Okumadım/Bilmediğim (practiced: false)
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
          // Sonraki cümle var
          return nextIndex;
        } else {
          // Cümleler bitti
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

  const toggleShowGerman = () => {
    setShowGerman({ ...showGerman, [currentIndex]: true });
  };

  const playAudio = async (audioPath: string, sentenceId: number) => {
    try {
      // Önceki sesi durdur
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      // Eğer aynı cümleyi tekrar çalıyorsak, sadece durdur
      if (currentPlayingId === sentenceId && isPlaying) {
        setIsPlaying(false);
        setCurrentPlayingId(null);
        return;
      }
      
      // Ses dosyası yolu: assets/audio/ klasöründen yükle
      let audioUri: string;
      let debuggerHost = 'localhost';
      
      if (__DEV__) {
        // Development: Metro bundler'ın IP adresini kullan
        const metroPort = '8081';
        
        // Constants'tan IP adresini al
        if (Constants.expoConfig?.hostUri) {
          debuggerHost = Constants.expoConfig.hostUri.split(':')[0];
        } else if (Constants.debuggerHost) {
          debuggerHost = Constants.debuggerHost.split(':')[0];
        } else {
          console.warn('Metro bundler IP adresi bulunamadı, localhost kullanılıyor.');
        }
        
        audioUri = `http://${debuggerHost}:${metroPort}/assets/audio/${encodeURIComponent(audioPath)}`;
      } else {
        // Production: Bundle'a dahil edilmiş asset'ler
        audioUri = `asset:/audio/${audioPath}`;
      }
      
      console.log('Playing audio:', audioUri);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setCurrentPlayingId(sentenceId);
      
      // Ses bittiğinde state'i güncelle
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!sentences || sentences.length === 0 || sentencesFinished || currentIndex >= sentences.length) {
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, showAll && styles.toggleButtonActive]}
              onPress={() => {
                setShowAll(!showAll);
                setSentencesFinished(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleButtonText, showAll && styles.toggleButtonTextActive]}>
                {showAll ? '📚 Sınırsız' : '📖 Günlük (5)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, recallMode && styles.toggleButtonActive]}
              onPress={() => {
                setRecallMode(!recallMode);
                setShowGerman({});
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleButtonText, recallMode && styles.toggleButtonTextActive]}>
                {recallMode ? '🧠 Recall' : '📖 Normal'}
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
            {sentencesFinished 
              ? showAll 
                ? '🎉 Tüm okunmamış cümleleri tamamladın!'
                : '🎉 Günlük cümleleri tamamladın!\n\nSınırsız moda geçebilirsin.'
              : 'Bu seviye için cümle bulunamadı.'}
          </Text>
          {sentencesFinished && !showAll && (
            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => {
                setShowAll(true);
                setSentencesFinished(false);
                loadSentences();
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
  const isGermanVisible = showGerman[currentIndex] || !recallMode;

  return (
    <View style={styles.container}>
      {/* Kontroller */}
      <View style={styles.controls}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, showAll && styles.toggleButtonActive]}
            onPress={() => setShowAll(!showAll)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleButtonText, showAll && styles.toggleButtonTextActive]}>
              {showAll ? '📚 Sınırsız' : '📖 Günlük (5)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, recallMode && styles.toggleButtonActive]}
            onPress={() => {
              setRecallMode(!recallMode);
              setShowGerman({});
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleButtonText, recallMode && styles.toggleButtonTextActive]}>
              {recallMode ? '🧠 Recall' : '📖 Normal'}
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
          <Text style={styles.swipeHintText}>← Okumadım/Bilmediğim</Text>
        </View>
        <View style={styles.swipeHintRight}>
          <Text style={styles.swipeHintText}>Okudum/Bildim →</Text>
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
          <View style={styles.cardContent}>
            {recallMode ? (
              // Recall Mode: Önce İngilizce göster
              <>
                {englishText && (
                  <View style={styles.meaningSection}>
                    <Text style={styles.meaningLabel}>Anlam</Text>
                    <Text style={styles.meaning} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {englishText}
                    </Text>
                  </View>
                )}
                {isGermanVisible ? (
                  <View style={styles.sentenceSection}>
                    <Text style={styles.sentenceLabel}>Almanca</Text>
                    <Text style={styles.sentenceDE} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {germanText}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.revealButton}
                    onPress={toggleShowGerman}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.revealButtonGradient}
                    >
                      <Text style={styles.revealButtonText}>Cevabı Göster</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              // Normal Mode: Her ikisi de göster
              <>
                <View style={styles.sentenceSection}>
                  <Text style={styles.sentenceDE} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {germanText}
                  </Text>
                </View>
                {englishText && (
                  <View style={styles.meaningSection}>
                    <Text style={styles.meaning} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {englishText}
                    </Text>
                  </View>
                )}
              </>
            )}
            
            {currentSentence.audio_path && (
              <TouchableOpacity
                style={styles.audioButton}
                onPress={() => currentSentence.audio_path && currentSentence.id && playAudio(currentSentence.audio_path, currentSentence.id)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={currentPlayingId === currentSentence.id && isPlaying 
                    ? [Colors.success, Colors.successLight]
                    : [Colors.info, Colors.infoLight]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.audioButtonGradient}
                >
                  <Text style={styles.audioButtonText}>
                    {currentPlayingId === currentSentence.id && isPlaying ? '⏸️' : '🎵'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            <View style={styles.sentenceInfo}>
              <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
                <Text style={[styles.levelText, { color: levelColor }]}>
                  {currentSentence.level}
                </Text>
              </View>
              {currentSentence.practiced && (
                <View style={[styles.practicedBadge, { backgroundColor: Colors.success + '20' }]}>
                  <Text style={styles.practicedText}>✓ Okundu</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Navigasyon */}
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
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  sentenceSection: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  sentenceLabel: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  sentenceDE: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
    width: '100%',
  },
  meaningSection: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  meaningLabel: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  meaning: {
    fontSize: 20,
    color: Colors.info,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 28,
    width: '100%',
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
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.colored,
  },
  audioButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonText: {
    fontSize: 28,
  },
  sentenceInfo: {
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
