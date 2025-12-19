import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { LessonService } from '../services/LessonService';
import { StorageService } from '../services/StorageService';
import { Lesson, LessonProgress } from '../models/Lesson';
import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { AudioService } from '../services/AudioService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 0.3;

type CardType = 'vocab' | 'sentence';
type CardStatus = 'review' | 'learning' | 'new';

interface CardItem {
  type: CardType;
  data: Vocabulary | Sentence;
  status: CardStatus;
}

export default function LessonScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();
  const { lessonId } = route.params as { lessonId: string };

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [grammarRead, setGrammarRead] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'grammar' | 'cards'>('grammar');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<number | string | null>(null);

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

  const currentCardIndexRef = useRef(currentCardIndex);
  useEffect(() => {
    currentCardIndexRef.current = currentCardIndex;
  }, [currentCardIndex]);

  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const lessonRef = useRef(lesson);
  useEffect(() => {
    lessonRef.current = lesson;
  }, [lesson]);

  // Ders yükleme
  const loadLesson = useCallback(async () => {
    try {
      setLoading(true);
      
      const level = lessonId.split('_')[0] as 'A1' | 'A2' | 'B1' | 'B2';
      const allLessons = await LessonService.loadLessons(level);
      const foundLesson = allLessons.find(l => l.lesson_id === lessonId);
      
      if (!foundLesson) {
        console.error('❌ Lesson not found:', lessonId);
        return;
      }
      
      console.log('📚 LessonScreen: Loaded lesson:', foundLesson.lesson_id);
      console.log('📚 Grammar items:', foundLesson.grammar?.length || 0);
      console.log('📚 Vocab IDs:', foundLesson.vocab_ids?.length || 0);
      console.log('📚 Sentence IDs:', foundLesson.sentence_ids?.length || 0);
      
      setLesson(foundLesson);

      // Progress kontrolü - grammar her zaman göster, sadece tamamlanma kontrolü için kullan
      const lessonProgress = await LessonService.getLessonProgress(lessonId);
      const grammarReadStatus = lessonProgress?.grammar_read || false;
      setGrammarRead(grammarReadStatus);

      // HER ZAMAN önce grammar göster (kullanıcı her açışta görmeli)
      setCurrentPhase('grammar');
      
      // Eğer grammar okunmuşsa kartları da yükle (hızlı erişim için, ama grammar gösterilmeye devam edecek)
      if (grammarReadStatus) {
        await loadCards(foundLesson);
      }
    } catch (error) {
      console.error('❌ Error loading lesson:', error);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  // Kartları yükle
  const loadCards = useCallback(async (lessonData: Lesson) => {
    try {
      console.log('📚 Loading cards for lesson:', lessonData.lesson_id);
      
      const vocab = await LessonService.loadLessonVocab(lessonData);
      const sentences = await LessonService.loadLessonSentences(lessonData);
      
      console.log('📚 Loaded vocab:', vocab.length, 'sentences:', sentences.length);
      
      const savedVocab = await StorageService.getVocabulary();
      const savedSentences = await StorageService.getSentences();
      
      const vocabMap = new Map(savedVocab.map(v => [v.id, v]));
      const sentenceMap = new Map(savedSentences.map(s => [s.id, s]));

      const cardItems: CardItem[] = [];

      // Önce vocab kartları
      vocab.forEach(v => {
        const saved = vocabMap.get(v.id);
        const status = saved?.status === 'review' ? 'review' : 
                      saved?.status === 'learning' ? 'learning' : 'new';
        cardItems.push({ 
          type: 'vocab', 
          data: saved ? { ...v, ...saved } : v, 
          status 
        });
      });

      // Sonra sentence kartları
      sentences.forEach(s => {
        const saved = sentenceMap.get(s.id);
        const status = saved?.status === 'review' ? 'review' : 
                      saved?.status === 'learning' ? 'learning' : 'new';
        cardItems.push({ 
          type: 'sentence', 
          data: saved ? { ...s, ...saved } : s, 
          status 
        });
      });

      // Sırala: vocab önce, sonra sentences, her grup içinde review → learning → new
      cardItems.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'vocab' ? -1 : 1;
        }
        const order = { review: 0, learning: 1, new: 2 };
        return order[a.status] - order[b.status];
      });

      console.log('📚 Total cards:', cardItems.length);
      console.log('📚 Vocab cards:', cardItems.filter(c => c.type === 'vocab').length);
      console.log('📚 Sentence cards:', cardItems.filter(c => c.type === 'sentence').length);
      console.log('📚 First card:', cardItems[0]?.type, 'Last card:', cardItems[cardItems.length - 1]?.type);

      setCards(cardItems);
      setCurrentCardIndex(0);
      setShowMeaning(false);
    } catch (error) {
      console.error('❌ Error loading cards:', error);
    }
  }, []);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // Grammar okundu
  const handleGrammarRead = useCallback(async () => {
    try {
      console.log('📖 Grammar read button pressed');
      await LessonService.markGrammarRead(lessonId);
      setGrammarRead(true);
      
      // lessonRef'ten güncel lesson'ı al
      const currentLesson = lessonRef.current;
      console.log('📖 Current lesson from ref:', currentLesson?.lesson_id);
      
      if (currentLesson) {
        console.log('📖 Loading cards after grammar read');
        await loadCards(currentLesson);
        console.log('📖 Cards loaded, switching to cards phase');
        setCurrentPhase('cards');
      } else {
        console.error('❌ Lesson is null, cannot load cards');
        // Fallback: lesson state'ten al
        const lessonState = lesson;
        if (lessonState) {
          console.log('📖 Using lesson from state as fallback');
          await loadCards(lessonState);
          setCurrentPhase('cards');
        }
      }
    } catch (error) {
      console.error('❌ Error marking grammar read:', error);
    }
  }, [lessonId, loadCards, lesson]);

  // Swipe işlemi
  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const currentIndex = currentCardIndexRef.current;
    const currentCards = cardsRef.current;
    const currentLesson = lessonRef.current;
    
    if (!currentCards[currentIndex] || !currentLesson) return;

    const card = currentCards[currentIndex];
    const isKnown = direction === 'right';

    try {
      // Kartı kaydet
      if (card.type === 'vocab') {
        const vocab = card.data as Vocabulary;
        const identifier = vocab.id || vocab.german || vocab.word;
        if (identifier) {
          await StorageService.updateVocabularyStatus(identifier, isKnown, vocab);
        }
      } else {
        const sentence = card.data as Sentence;
        const sentenceId = sentence.id;
        console.log('🔄 Swiping sentence card:', sentenceId, 'type:', typeof sentenceId, 'isKnown:', isKnown);
        if (sentenceId !== undefined && sentenceId !== null) {
          // ID'yi number'a çevir
          const numericId = typeof sentenceId === 'string' ? parseInt(sentenceId, 10) : sentenceId;
          if (!isNaN(numericId)) {
            await StorageService.markSentencePracticed(numericId, isKnown, sentence);
            console.log('✅ Sentence marked as practiced:', numericId, 'isKnown:', isKnown);
          } else {
            console.error('❌ Sentence ID is not a valid number!', sentenceId);
          }
        } else {
          console.error('❌ Sentence ID is missing!', sentence);
        }
      }

      // Progress güncelle
      await LessonService.updateLessonProgressCounts(lessonId, currentLesson);
      
      // Tamamlanma kontrolü - her swipe'dan sonra kontrol et
      const isCompleted = await LessonService.checkLessonCompletion(lessonId, currentLesson);
      if (isCompleted) {
        console.log('✅ Lesson completed:', lessonId);
        await LessonService.markLessonCompleted(lessonId);
        StorageService.clearCache();
        
        // Kısa bir gecikme sonra geri dön (cache'in temizlenmesi için)
        setTimeout(() => {
          navigation.goBack();
        }, 300);
        return;
      }
    } catch (error) {
      console.error('❌ Error handling swipe:', error);
    }

    // Animasyon
    Animated.timing(position, {
      toValue: { x: direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      
      if (currentIndex < currentCards.length - 1) {
        setCurrentCardIndex(currentIndex + 1);
        setShowMeaning(false);
      } else {
        // Tüm kartlar bitti, tekrar kontrol et
        if (currentLesson) {
          LessonService.checkLessonCompletion(lessonId, currentLesson).then(async isCompleted => {
            if (isCompleted) {
              console.log('✅ All cards done, lesson completed');
              await LessonService.markLessonCompleted(lessonId);
              StorageService.clearCache();
              // Kısa bir gecikme sonra geri dön (AsyncStorage yazma işleminin tamamlanması için)
              setTimeout(() => {
                navigation.goBack();
              }, 300);
            } else {
              console.log('⚠️ All cards done but lesson not completed yet');
              navigation.goBack();
            }
          });
        } else {
          navigation.goBack();
        }
      }
    });
  }, [lessonId, position, navigation]);

  // PanResponder
  const panResponder = useRef<any>(null);

  useEffect(() => {
    if (currentPhase !== 'cards') {
      panResponder.current = null;
      return;
    }
    
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
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
  }, [handleSwipe, currentPhase, position]);

  // Audio oynat
  const playAudio = async (audioPath: string, id: number | string) => {
    if (currentPlayingId === id && isPlaying) {
      AudioService.stop();
      setIsPlaying(false);
      setCurrentPlayingId(null);
      return;
    }

    try {
      setIsPlaying(true);
      setCurrentPlayingId(id);
      await AudioService.playAudio(audioPath, String(id));
      setIsPlaying(false);
      setCurrentPlayingId(null);
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1': return Colors.levelA1;
      case 'A2': return Colors.levelA2;
      case 'B1': return Colors.levelB1;
      case 'B2': return Colors.levelB2;
      default: return Colors.primary;
    }
  };

  if (!lesson) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Ders bulunamadı</Text>
      </View>
    );
  }

  const levelColor = getLevelColor(lesson.level);
  const currentCard = cards[currentCardIndex];
  const progressPercent = cards.length > 0 ? ((currentCardIndex + 1) / cards.length) * 100 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{lesson.lesson_id}</Text>
          <Text style={styles.headerSubtitle}>{lesson.title}</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>
            {currentPhase === 'grammar' ? '0%' : `${Math.round(progressPercent)}%`}
          </Text>
        </View>
      </View>

      {currentPhase === 'grammar' ? (
        /* Grammar Bölümü */
        <ScrollView 
          style={styles.grammarContainer} 
          contentContainerStyle={styles.grammarContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          bounces={true}
        >
          <View style={styles.grammarHeader}>
            <Text style={styles.grammarTitle}>📚 Gramer</Text>
          </View>
          {lesson.grammar && Array.isArray(lesson.grammar) && lesson.grammar.length > 0 ? (
            lesson.grammar.map((text, index) => (
              <View key={index} style={styles.grammarItem}>
                <Text style={styles.grammarText}>{text || ''}</Text>
              </View>
            ))
          ) : (
            <View style={styles.grammarItem}>
              <Text style={styles.grammarText}>Gramer içeriği bulunamadı.</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.readButton, grammarRead && styles.readButtonCompleted]}
            onPress={handleGrammarRead}
          >
            <Text style={styles.readButtonText}>
              {grammarRead ? '✓ Okudum' : '✓ Okudum'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* Kart Bölümü */
        <View style={styles.cardsContainer}>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[levelColor, levelColor + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>

          {/* Swipe Hints */}
          <View style={styles.swipeHints}>
            <Text style={styles.swipeHintText}>← Bilmiyorum</Text>
            <Text style={styles.swipeHintText}>Biliyorum →</Text>
          </View>

          {/* Card */}
          {cards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Kart yükleniyor...</Text>
            </View>
          ) : currentCard ? (
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
                  <View style={styles.cardWrapper}>
                    <View style={[styles.colorAccent, { backgroundColor: levelColor }]} />
                    <View style={styles.cardBody}>
                      {currentCard.type === 'vocab' ? (
                        <VocabCard
                          vocab={currentCard.data as Vocabulary}
                          showMeaning={showMeaning}
                          levelColor={levelColor}
                          playAudio={playAudio}
                          isPlaying={isPlaying}
                          currentPlayingId={currentPlayingId}
                        />
                      ) : (
                        <SentenceCard
                          sentence={currentCard.data as Sentence}
                          showMeaning={showMeaning}
                          levelColor={levelColor}
                          playAudio={playAudio}
                          isPlaying={isPlaying}
                          currentPlayingId={currentPlayingId}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tüm kartlar tamamlandı! 🎉</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// Vocab Card Component
function VocabCard({ vocab, showMeaning, levelColor, playAudio, isPlaying, currentPlayingId }: {
  vocab: Vocabulary;
  showMeaning: boolean;
  levelColor: string;
  playAudio: (path: string, id: number | string) => void;
  isPlaying: boolean;
  currentPlayingId: number | string | null;
}) {
  const wordId = vocab.id || vocab.german || vocab.word;
  return (
    <>
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: levelColor + '20', borderColor: levelColor }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>{vocab.level}</Text>
        </View>
        <View style={styles.headerRight}>
          {vocab.audio_path && (
            <TouchableOpacity
              style={styles.audioButtonTop}
              onPress={() => {
                if (wordId && vocab.audio_path) playAudio(vocab.audio_path, wordId);
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[Colors.success, Colors.successLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.audioButtonGradientTop}
              >
                <Text style={styles.audioButtonTextTop}>
                  {currentPlayingId === wordId && isPlaying ? '⏸️' : '🎵'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.wordSection}>
        {vocab.article && vocab.article.trim() ? (
          <Text style={styles.article}>{vocab.article}</Text>
        ) : null}
        <Text 
          style={styles.word}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {vocab.german || vocab.word || ''}
        </Text>
      </View>
      {vocab.image_path && 
       vocab.image_path !== '""' && 
       vocab.image_path.trim() && 
       vocab.image_path.trim().length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: __DEV__ 
                ? `http://localhost:8081/assets/images/${encodeURIComponent(vocab.image_path.trim())}`
                : `asset:/images/${vocab.image_path.trim()}`
            }}
            style={styles.wordImage}
            resizeMode="contain"
            onError={(error) => {
              console.log('Image load error:', error.nativeEvent.error);
            }}
          />
        </View>
      )}
      {showMeaning ? (
        <View style={styles.meaningSection}>
          <View style={styles.meaningCard}>
            <Text style={styles.meaningLabel}>Anlam</Text>
            <Text style={styles.meaning} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
              {vocab.english || vocab.meaning_tr || ''}
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
      {vocab.example_sentence && (
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleLabel}>💡 Örnek</Text>
          <Text style={styles.exampleDE} numberOfLines={2}>
            {vocab.example_sentence || ''}
          </Text>
          {vocab.example_translation && showMeaning && (
            <Text style={styles.exampleEN}>
              {vocab.example_translation || ''}
            </Text>
          )}
        </View>
      )}
    </>
  );
}

// Sentence Card Component
function SentenceCard({ sentence, showMeaning, levelColor, playAudio, isPlaying, currentPlayingId }: {
  sentence: Sentence;
  showMeaning: boolean;
  levelColor: string;
  playAudio: (path: string, id: number | string) => void;
  isPlaying: boolean;
  currentPlayingId: number | string | null;
}) {
  const germanText = sentence.german_sentence || sentence.de;
  const englishText = sentence.english_translation || sentence.tr || sentence.en;
  
  return (
    <>
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: levelColor + '20', borderColor: levelColor }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>{sentence.level}</Text>
        </View>
        <View style={styles.headerRight}>
          {sentence.audio_path && (
            <TouchableOpacity
              style={styles.audioButtonTop}
              onPress={() => {
                if (sentence.id !== undefined && sentence.id !== null && sentence.audio_path) {
                  playAudio(sentence.audio_path, sentence.id);
                }
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[Colors.success, Colors.successLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.audioButtonGradientTop}
              >
                <Text style={styles.audioButtonTextTop}>
                  {currentPlayingId === sentence.id && isPlaying ? '⏸️' : '🎵'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.sentenceSection}>
        <Text style={styles.sentenceDE} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.6}>
          {germanText}
        </Text>
      </View>
      {sentence.image_path && 
       sentence.image_path !== '""' && 
       sentence.image_path.trim() && 
       sentence.image_path.trim().length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: __DEV__ 
                ? `http://localhost:8081/assets/images/${encodeURIComponent(sentence.image_path.trim())}`
                : `asset:/images/${sentence.image_path.trim()}`
            }}
            style={styles.sentenceImage}
            resizeMode="contain"
            onError={(error) => {
              console.log('Image load error:', error.nativeEvent.error);
            }}
          />
        </View>
      )}
      {showMeaning ? (
        englishText && (
          <View style={styles.meaningSection}>
            <View style={styles.meaningCard}>
              <Text style={styles.meaningLabel}>Çeviri</Text>
              <Text style={styles.meaning}>
                {englishText || ''}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  progressBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.full,
  },
  progressBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  grammarContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  grammarContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl * 3,
    flexGrow: 1,
  },
  grammarHeader: {
    marginBottom: Spacing.lg,
  },
  grammarTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  grammarItem: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  grammarText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  readButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    ...Shadows.medium,
  },
  readButtonCompleted: {
    backgroundColor: Colors.success,
  },
  readButtonText: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  cardsContainer: {
    flex: 1,
  },
  progressBarContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  swipeHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
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
  wordSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  article: {
    fontSize: 24,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  word: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -1.2,
    lineHeight: 60,
  },
  sentenceSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  sentenceDE: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 42,
  },
  meaningSection: {
    marginVertical: Spacing.lg,
    width: '100%',
  },
  meaningLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  meaning: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  masteredBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.achievement + '20',
    borderWidth: 1,
    borderColor: Colors.achievement,
  },
  masteredText: {
    ...Typography.caption,
    color: Colors.achievement,
    fontWeight: '700',
    fontSize: 10,
  },
  audioButtonTop: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.medium,
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
  sentenceImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundTertiary,
  },
  meaningCard: {
    backgroundColor: Colors.primary + '15',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
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
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
