import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { TestService, TestMode } from '../services/TestService';
import { StorageService } from '../services/StorageService';
import { ProgressService } from '../services/ProgressService';
import { Vocabulary } from '../models/Vocabulary';
import { Sentence } from '../models/Sentence';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

type ContentType = 'words' | 'sentences';

export default function TestScreen() {
  const [contentType, setContentType] = useState<ContentType>('words');
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState<TestMode>('review');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [testFinished, setTestFinished] = useState(false);

  // useRef ile currentIndex'i takip et
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const sentencesRef = useRef(sentences);
  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    loadCurrentLevel();
  }, []);

  // Test modu veya contentType değiştiğinde ilerlemeyi sıfırla ve içeriği yükle
  useEffect(() => {
    if (currentLevel) {
      // Test modu veya contentType değiştiğinde içeriği yükle
      // İlerlemeyi sıfırlama - her mod için ayrı ilerleme kaydı var
      loadContent();
    }
  }, [currentLevel, testMode, contentType]);

  // Ekrana geri döndüğünde ilerlemeyi yükle (test modu/contentType değişmediyse)
  useFocusEffect(
    useCallback(() => {
      if (!currentLevel) return;
      
      // İçerik zaten yüklüyse, sadece ilerlemeyi yükle
      const loadProgress = async () => {
        const savedIndex = await StorageService.loadTestProgress(
          contentType,
          testMode === 'mixed' ? 'review' : testMode,
          currentLevel
        );
        
        if (savedIndex !== null && savedIndex >= 0) {
          const totalItems = contentType === 'words' ? wordsRef.current.length : sentencesRef.current.length;
          if (savedIndex < totalItems && totalItems > 0) {
            setCurrentIndex(savedIndex);
          }
        }
      };
      
      // İçerik yüklüyse ilerlemeyi yükle
      if (wordsRef.current.length > 0 || sentencesRef.current.length > 0) {
        loadProgress();
      }
    }, [currentLevel, contentType, testMode])
  );
  
  // currentIndex değiştiğinde ilerlemeyi kaydet (sadece içerik yüklendikten sonra)
  useEffect(() => {
    if (currentLevel && currentIndex > 0 && (words.length > 0 || sentences.length > 0)) {
      // Sadece test başladıktan sonra kaydet (currentIndex > 0)
      StorageService.saveTestProgress(
        contentType,
        testMode === 'mixed' ? 'review' : testMode,
        currentLevel,
        currentIndex
      ).catch(err => console.error('Error saving test progress:', err));
    }
  }, [currentIndex]);

  useEffect(() => {
    if (contentType === 'words' && words.length > 0 && currentIndex < words.length) {
      loadWordOptions();
    } else if (contentType === 'sentences' && sentences.length > 0 && currentIndex < sentences.length) {
      loadSentenceOptions();
    }
  }, [words, sentences, currentIndex, contentType]);

  const loadCurrentLevel = async () => {
    try {
      const progress = await ProgressService.calculateProgress();
      setCurrentLevel(progress.current_level);
    } catch (error) {
      console.error('Error loading current level:', error);
      setCurrentLevel('A1');
    }
  };

  const loadContent = async () => {
    try {
      if (!currentLevel) return;
      
      let wordsToShow: Vocabulary[] = [];
      let sentencesToShow: Sentence[] = [];
      
      if (contentType === 'words') {
        wordsToShow = await TestService.getWordsForTest(currentLevel, testMode);
        setWords(wordsToShow);
        setSentences([]);
      } else {
        sentencesToShow = await TestService.getSentencesForTest(currentLevel, testMode);
        setSentences(sentencesToShow);
        setWords([]);
      }
      
      // Kaydedilmiş ilerlemeyi yükle
      const savedIndex = await StorageService.loadTestProgress(
        contentType,
        testMode === 'mixed' ? 'review' : testMode,
        currentLevel
      );
      
      // Eğer kaydedilmiş ilerleme varsa ve geçerliyse, onu kullan
      const totalItems = contentType === 'words' ? wordsToShow.length : sentencesToShow.length;
      
      if (savedIndex !== null && savedIndex >= 0 && savedIndex < totalItems) {
        setCurrentIndex(savedIndex);
      } else {
        setCurrentIndex(0);
      }
      
      setSelectedOption(null);
      setShowResult(false);
      setTestFinished(false);
    } catch (error) {
      console.error('Error loading test content:', error);
    }
  };

  // "Biliyorum" modunda yeni rastgele içerik yükle
  const loadMoreKnownContent = async () => {
    try {
      if (!currentLevel) return;
      
      // İlerlemeyi sıfırla (yeni test başlıyor)
      await StorageService.clearTestProgress(contentType, 'known', currentLevel);
      
      if (contentType === 'words') {
        const wordsToShow = await TestService.getWordsForTest(currentLevel, 'known');
        const shuffled = [...wordsToShow].sort(() => Math.random() - 0.5);
        setWords(shuffled);
        setSentences([]);
      } else {
        const sentencesToShow = await TestService.getSentencesForTest(currentLevel, 'known');
        const shuffled = [...sentencesToShow].sort(() => Math.random() - 0.5);
        setSentences(shuffled);
        setWords([]);
      }
      
      setCurrentIndex(0);
      setSelectedOption(null);
      setShowResult(false);
      setTestFinished(false);
    } catch (error) {
      console.error('Error loading more known content:', error);
    }
  };

  const loadWordOptions = async () => {
    if (!currentLevel || words.length === 0 || currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    try {
      const wrongOptions = await TestService.getWrongOptions(currentWord, currentLevel, 3);
      const correctAnswer = currentWord.english || currentWord.meaning_tr || '';
      const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
      setSelectedOption(null);
      setShowResult(false);
    } catch (error) {
      console.error('Error loading word options:', error);
    }
  };

  const loadSentenceOptions = async () => {
    if (!currentLevel || sentences.length === 0 || currentIndex >= sentences.length) return;
    
    const currentSentence = sentences[currentIndex];
    try {
      const wrongOptions = await TestService.getWrongOptionsForSentence(currentSentence, currentLevel, 3);
      const correctAnswer = currentSentence.english_translation || currentSentence.tr || currentSentence.en || '';
      const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
      setSelectedOption(null);
      setShowResult(false);
    } catch (error) {
      console.error('Error loading sentence options:', error);
    }
  };

  const handleAnswer = async (option: string) => {
    if (showResult) return;

    let isCorrect = false;
    let identifier: string | number | undefined;
    const currentIdx = currentIndexRef.current;

    if (contentType === 'words') {
      if (!words[currentIdx]) return;
      const word = words[currentIdx];
      identifier = word.id || word.german || word.word;
      const correctAnswer = word.english || word.meaning_tr || '';
      isCorrect = option === correctAnswer;

      setSelectedOption(option);
      setShowResult(true);

      if (identifier) {
        try {
          const mode = testMode === 'mixed' ? 'review' : testMode;
          await StorageService.recordTestResult(identifier, isCorrect, word, mode as 'known' | 'unknown' | 'review');
        } catch (error) {
          console.error('Error recording test result:', error);
        }
      }
    } else {
      if (!sentences[currentIdx]) return;
      const sentence = sentences[currentIdx];
      identifier = sentence.id;
      const correctAnswer = sentence.english_translation || sentence.tr || sentence.en || '';
      isCorrect = option === correctAnswer;

      setSelectedOption(option);
      setShowResult(true);

      if (identifier) {
        try {
          const mode = testMode === 'mixed' ? 'review' : testMode;
          await StorageService.recordSentenceTestResult(identifier, isCorrect, sentence, mode as 'known' | 'unknown' | 'review');
        } catch (error) {
          console.error('Error recording sentence test result:', error);
        }
      }
    }

    // 0.5 saniye sonra sonraki soruya geç
    setTimeout(() => {
      const nextIndex = currentIndexRef.current + 1;
      const hasMore = contentType === 'words' 
        ? nextIndex < wordsRef.current.length
        : nextIndex < sentencesRef.current.length;
      
      if (hasMore) {
        setCurrentIndex(nextIndex);
        setSelectedOption(null);
        setShowResult(false);
        
        // İlerlemeyi kaydet
        StorageService.saveTestProgress(
          contentType,
          testMode === 'mixed' ? 'review' : testMode,
          currentLevel,
          nextIndex
        ).catch(err => console.error('Error saving test progress:', err));
        } else {
          // Test bitti - ilerlemeyi sıfırla
          StorageService.clearTestProgress(
            contentType,
            testMode === 'mixed' ? 'review' : testMode,
            currentLevel
          ).catch(err => console.error('Error clearing test progress:', err));
          
          if (testMode === 'known') {
            setTestFinished(true);
          } else {
            // Test bitti, yeni test başlat (ilerleme zaten sıfırlandı)
            loadContent();
          }
        }
    }, 500);
  };


  const hasContent = contentType === 'words' ? words.length > 0 : sentences.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.container}>
        {/* İçerik Tipi Seçimi */}
        <View style={styles.contentTypeBar}>
          <TouchableOpacity
            style={[styles.contentTypeItem, contentType === 'words' && styles.contentTypeItemActive]}
            onPress={() => {
              setContentType('words');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.contentTypeText, contentType === 'words' && styles.contentTypeTextActive]}>
              📖 Kelimeler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contentTypeItem, contentType === 'sentences' && styles.contentTypeItemActive]}
            onPress={() => {
              setContentType('sentences');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.contentTypeText, contentType === 'sentences' && styles.contentTypeTextActive]}>
              💬 Cümleler
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Modu Seçimi */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, testMode === 'review' && styles.tabItemActive]}
            onPress={() => {
              setTestMode('review');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, testMode === 'review' && styles.tabTextActive]}>
              🔄 Tekrar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, testMode === 'unknown' && styles.tabItemActive]}
            onPress={() => {
              setTestMode('unknown');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, testMode === 'unknown' && styles.tabTextActive]}>
              ❌ Bilmediğim
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, testMode === 'known' && styles.tabItemActive]}
            onPress={() => {
              setTestMode('known');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, testMode === 'known' && styles.tabTextActive]}>
              ✅ Bildiğim
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {testMode === 'review' && `Tekrar zamanı gelen ${contentType === 'words' ? 'kelime' : 'cümle'} yok`}
            {testMode === 'unknown' && `Bilmediğin ${contentType === 'words' ? 'kelime' : 'cümle'} yok`}
            {testMode === 'known' && `Bildiğin ${contentType === 'words' ? 'kelime' : 'cümle'} yok`}
          </Text>
        </View>
      </View>
    );
  }

  // Test bitti mi kontrolü
  if (testFinished && testMode === 'known') {
    // TypeScript tip daraltmasını önlemek için testMode'u önce kaydet
    const savedMode = testMode as TestMode;
    return (
      <View style={styles.container}>
        {/* İçerik Tipi Seçimi */}
        <View style={styles.contentTypeBar}>
          <TouchableOpacity
            style={[styles.contentTypeItem, contentType === 'words' && styles.contentTypeItemActive]}
            onPress={() => {
              setContentType('words');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.contentTypeText, contentType === 'words' && styles.contentTypeTextActive]}>
              📖 Kelimeler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contentTypeItem, contentType === 'sentences' && styles.contentTypeItemActive]}
            onPress={() => {
              setContentType('sentences');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.contentTypeText, contentType === 'sentences' && styles.contentTypeTextActive]}>
              💬 Cümleler
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Modu Seçimi */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, savedMode === 'review' && styles.tabItemActive]}
            onPress={() => {
              setTestMode('review');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, savedMode === 'review' && styles.tabTextActive]}>
              🔄 Tekrar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, savedMode === 'unknown' && styles.tabItemActive]}
            onPress={() => {
              setTestMode('unknown');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, savedMode === 'unknown' && styles.tabTextActive]}>
              ❌ Bilmediğim
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, savedMode === 'known' && styles.tabItemActive]}
            onPress={() => {
              setTestMode('known');
              setTestFinished(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, savedMode === 'known' && styles.tabTextActive]}>
              ✅ Bildiğim
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bitiş Mesajı */}
        <View style={styles.centerContainer}>
          <Text style={styles.finishedEmoji}>🎉</Text>
          <Text style={styles.finishedTitle}>Hepsini Bitirdin!</Text>
          <Text style={styles.finishedSubtitle}>
            Tüm bildiğin {contentType === 'words' ? 'kelimeleri' : 'cümleleri'} test ettin. Tekrar etmek ister misin?
          </Text>
          <TouchableOpacity
            style={styles.restartButton}
            onPress={loadMoreKnownContent}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.restartButtonGradient}
            >
              <Text style={styles.restartButtonText}>🔄 Tekrar Et</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentItem = contentType === 'words' ? words[currentIndex] : sentences[currentIndex];
  if (!currentItem) return null;

  const levelColors: Record<string, string> = {
    A1: Colors.levelA1,
    A2: Colors.levelA2,
    B1: Colors.levelB1,
    B2: Colors.levelB2,
  };
  const levelColor = levelColors[currentItem.level] || Colors.primary;
  const correctAnswer = contentType === 'words'
    ? (currentItem as Vocabulary).english || (currentItem as Vocabulary).meaning_tr || ''
    : (currentItem as Sentence).english_translation || (currentItem as Sentence).tr || (currentItem as Sentence).en || '';
  const totalItems = contentType === 'words' ? words.length : sentences.length;

  return (
    <View style={styles.container}>
      {/* İçerik Tipi Seçimi */}
      <View style={styles.contentTypeBar}>
        <TouchableOpacity
          style={[styles.contentTypeItem, contentType === 'words' && styles.contentTypeItemActive]}
          onPress={() => {
            setContentType('words');
            setTestFinished(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.contentTypeText, contentType === 'words' && styles.contentTypeTextActive]}>
            📖 Kelimeler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contentTypeItem, contentType === 'sentences' && styles.contentTypeItemActive]}
          onPress={() => {
            setContentType('sentences');
            setTestFinished(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.contentTypeText, contentType === 'sentences' && styles.contentTypeTextActive]}>
            💬 Cümleler
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Modu Seçimi */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, testMode === 'review' && styles.tabItemActive]}
          onPress={() => {
            setTestMode('review');
            setTestFinished(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, testMode === 'review' && styles.tabTextActive]}>
            🔄 Tekrar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, testMode === 'unknown' && styles.tabItemActive]}
          onPress={() => {
            setTestMode('unknown');
            setTestFinished(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, testMode === 'unknown' && styles.tabTextActive]}>
            ❌ Bilmediğim
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, testMode === 'known' && styles.tabItemActive]}
          onPress={() => {
            setTestMode('known');
            setTestFinished(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, testMode === 'known' && styles.tabTextActive]}>
            ✅ Bildiğim
          </Text>
        </TouchableOpacity>
      </View>

      {/* İlerleme */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>İlerleme</Text>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {totalItems}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / totalItems) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Soru Kartı */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.questionSection}>
              <Text style={styles.questionLabel}>
                {contentType === 'words' ? 'Bu kelimenin anlamı nedir?' : 'Bu cümlenin anlamı nedir?'}
              </Text>
              {contentType === 'words' ? (
                <View style={styles.wordContainer}>
                  {(currentItem as Vocabulary).article && (
                    <Text style={styles.article}>{(currentItem as Vocabulary).article}</Text>
                  )}
                  <Text style={styles.word} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>
                    {(currentItem as Vocabulary).german || (currentItem as Vocabulary).word}
                  </Text>
                </View>
              ) : (
                <View style={styles.sentenceContainer}>
                  <Text style={styles.sentence} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {(currentItem as Sentence).german_sentence || (currentItem as Sentence).de}
                  </Text>
                </View>
              )}
            </View>

            {contentType === 'words' && (currentItem as Vocabulary).example_sentence && (
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleLabel}>💡 Örnek</Text>
                <Text style={styles.exampleDE} numberOfLines={2}>
                  {(currentItem as Vocabulary).example_sentence}
                </Text>
              </View>
            )}

            <View style={styles.levelBadgeContainer}>
              <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
                <Text style={[styles.levelText, { color: levelColor }]}>
                  {currentItem.level}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Seçenekler */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isCorrect = option === correctAnswer;
          const isSelected = selectedOption === option;
          const showCorrect = showResult && isCorrect;
          const showWrong = showResult && isSelected && !isCorrect;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                showCorrect && styles.optionButtonCorrect,
                showWrong && styles.optionButtonWrong,
                showResult && !isSelected && !isCorrect && styles.optionButtonDisabled,
              ]}
              onPress={() => handleAnswer(option)}
              disabled={showResult}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                showCorrect && styles.optionTextCorrect,
                showWrong && styles.optionTextWrong,
              ]}>
                {option}
              </Text>
              {showCorrect && <Text style={styles.optionIcon}>✓</Text>}
              {showWrong && <Text style={styles.optionIcon}>✗</Text>}
            </TouchableOpacity>
          );
        })}
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
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  // İçerik Tipi Seçimi
  contentTypeBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  contentTypeItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  contentTypeItemActive: {
    backgroundColor: Colors.primary + '20',
  },
  contentTypeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textTertiary,
    fontSize: 14,
  },
  contentTypeTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  // Modern Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
  },
  tabItemActive: {
    backgroundColor: Colors.primary + '20',
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textTertiary,
    fontSize: 13,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
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
  // Bitiş Mesajı
  finishedEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  finishedTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontWeight: 'bold',
  },
  finishedSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxxl,
    lineHeight: 24,
  },
  restartButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.colored,
  },
  restartButtonGradient: {
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  restartButtonText: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  cardContainer: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.card,
    ...Shadows.large,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cardContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  questionSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  questionLabel: {
    ...Typography.body,
    color: Colors.textTertiary,
    marginBottom: Spacing.xl,
    fontWeight: '600',
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
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sentenceContainer: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  sentence: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
  },
  article: {
    fontSize: 20,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    fontWeight: '600',
    marginRight: Spacing.xs,
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
    fontStyle: 'italic',
    lineHeight: 20,
  },
  levelBadgeContainer: {
    marginTop: Spacing.md,
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
  optionsContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  optionButton: {
    padding: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.small,
  },
  optionButtonCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '20',
  },
  optionButtonWrong: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '20',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: Colors.success,
  },
  optionTextWrong: {
    color: Colors.error,
  },
  optionIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: Spacing.md,
  },
});
