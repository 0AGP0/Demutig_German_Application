import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DataService } from '../services/DataService';
import { StorageService } from '../services/StorageService';
import { AudioService } from '../services/AudioService';
import { Vocabulary } from '../models/Vocabulary';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterType = 'all' | 'favorites' | 'mastered' | 'learning' | 'new';

const FILTER_CONFIG = [
  { key: 'all', label: 'Tümü', icon: '📚', gradient: ['#1A1A1A', '#2A2A2A'] },
  { key: 'favorites', label: 'Favoriler', icon: '⭐', gradient: ['#FF9500', '#FFB84D'] },
  { key: 'mastered', label: 'Öğrenildi', icon: '✓', gradient: ['#58CC02', '#7ED321'] },
  { key: 'learning', label: 'Öğreniliyor', icon: '📖', gradient: ['#1CB0F6', '#4FC3F7'] },
  { key: 'new', label: 'Yeni', icon: '•', gradient: ['#CE82FF', '#E1A5FF'] },
];

export default function DictionaryScreen() {
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [filteredWords, setFilteredWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedWord, setSelectedWord] = useState<Vocabulary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      
      const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
      const allWords: Vocabulary[] = [];
      
      for (const level of allLevels) {
        const levelWords = await DataService.loadVocabulary(level);
        allWords.push(...levelWords);
      }
      
      const savedWords = await StorageService.getVocabulary();
      
      // Identifier oluşturma: id, german ve word ile 3 farklı key ekle
      const savedWordsMap = new Map<string | number, Vocabulary>();
      savedWords.forEach(w => {
        if (w.id) savedWordsMap.set(w.id, w);
        if (w.german) savedWordsMap.set(w.german, w);
        if (w.word) savedWordsMap.set(w.word, w);
      });
      
      // Merge: önce id'ye bak, sonra german, sonra word
      const mergedWords = allWords.map(word => {
        let saved = null;
        if (word.id) saved = savedWordsMap.get(word.id);
        if (!saved && word.german) saved = savedWordsMap.get(word.german);
        if (!saved && word.word) saved = savedWordsMap.get(word.word);
        return saved ? { ...word, ...saved } : word;
      });
      
      mergedWords.sort((a, b) => {
        const aWord = (a.german || a.word || '').toLowerCase();
        const bWord = (b.german || b.word || '').toLowerCase();
        return aWord.localeCompare(bWord);
      });
      
      setWords(mergedWords);
      setFilteredWords(mergedWords);
    } catch (error) {
      console.error('Error loading dictionary:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    let result = [...words];
    
    if (filter === 'favorites') {
      result = result.filter(w => w.isFavorite === true);
    } else if (filter === 'mastered') {
      result = result.filter(w => (w.knownCount || 0) >= 3);
    } else if (filter === 'learning') {
      result = result.filter(w => {
        const count = w.knownCount || 0;
        return count > 0 && count < 3;
      });
    } else if (filter === 'new') {
      result = result.filter(w => !w.knownCount || w.knownCount === 0);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(w => {
        const german = (w.german || w.word || '').toLowerCase();
        const english = (w.english || w.meaning_tr || '').toLowerCase();
        return german.includes(query) || english.includes(query);
      });
    }
    
    setFilteredWords(result);
  }, [searchQuery, filter, words]);

  const toggleFavorite = async (word: Vocabulary) => {
    const identifier = word.id || word.german || word.word;
    if (!identifier) return;
    
    const newFavoriteState = !word.isFavorite;
    await StorageService.toggleFavorite(identifier, newFavoriteState);
    
    // State'i direkt güncelle - reload YOK
    setWords(prevWords => 
      prevWords.map(w => 
        (w.id === word.id || w.german === word.german) 
          ? { ...w, isFavorite: newFavoriteState }
          : w
      )
    );
    
    // Modal'daki kelimeyi güncelle
    if (selectedWord && (selectedWord.id === word.id || selectedWord.german === word.german)) {
      setSelectedWord({ ...selectedWord, isFavorite: newFavoriteState });
    }
  };

  const addToReview = async (word: Vocabulary) => {
    const identifier = word.id || word.german || word.word;
    if (!identifier) return;
    
    await StorageService.addToReview(identifier);
    setModalVisible(false);
  };

  const playAudio = async (audioPath: string) => {
    try {
      setIsPlaying(true);
      const wordIdStr = String(selectedWord?.id || 'word');
      await AudioService.playAudio(audioPath, `dict_${wordIdStr}`);
      setTimeout(() => setIsPlaying(false), 100);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const getProgressGradient = (knownCount: number): string[] => {
    if (knownCount >= 3) return ['#58CC02', '#7ED321'];
    if (knownCount > 0) return ['#1CB0F6', '#4FC3F7'];
    return ['#2A2A2A', '#3A3A3A'];
  };

  const renderWordItem = ({ item }: { item: Vocabulary }) => {
    const knownCount = item.knownCount || 0;
    const progressGradient = getProgressGradient(knownCount);
    
    // Seviye rengini belirle
    const levelColors: Record<string, string> = {
      A1: Colors.levelA1,
      A2: Colors.levelA2,
      B1: Colors.levelB1,
      B2: Colors.levelB2,
    };
    const levelColor = levelColors[item.level || 'A1'] || Colors.levelA1;
    
    return (
      <TouchableOpacity
        style={styles.wordCard}
        onPress={() => {
          setSelectedWord(item);
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.cardWrapper}>
          {/* Left Accent */}
          <LinearGradient
            colors={progressGradient}
            style={styles.accentBar}
          />
          
          <View style={styles.cardContent}>
            {/* Main Word Section - Prominent */}
            <View style={styles.wordSection}>
              <View style={styles.wordTitleRow}>
                <View style={styles.wordTitleLeft}>
                  <Text style={styles.wordGerman} numberOfLines={1}>
                    {item.article && <Text style={styles.wordArticle}>{item.article} </Text>}
                    {item.german || item.word}
                  </Text>
                  <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
                    <Text style={[styles.levelBadgeText, { color: levelColor }]}>
                      {item.level || 'A1'}
                    </Text>
                  </View>
                </View>
                {item.isFavorite && <Text style={styles.favoriteStar}>★</Text>}
              </View>
              <Text style={styles.wordMeaning} numberOfLines={2}>
                {item.english || item.meaning_tr}
              </Text>
            </View>
            
            {/* Minimal Progress */}
            <View style={styles.progressMini}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.miniDot,
                    knownCount > i && styles.miniDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Modern Header with Blur Effect */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sözlük</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.headerCount}>{filteredWords.length}</Text>
          <Text style={styles.headerLabel}>kelime</Text>
        </View>
      </View>

      {/* Sleek Search */}
      <View style={styles.searchContainer}>
        <LinearGradient
          colors={[Colors.backgroundTertiary, Colors.backgroundSecondary]}
          style={styles.searchGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Kelime ara..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>×</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* Gradient Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {FILTER_CONFIG.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key as FilterType)}
              activeOpacity={0.8}
              style={styles.filterChip}
            >
              <LinearGradient
                colors={filter === f.key ? f.gradient : [Colors.backgroundTertiary, Colors.backgroundTertiary]}
                style={styles.filterGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.filterIcon}>{f.icon}</Text>
                <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                  {f.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Word List */}
      <FlatList
        data={filteredWords}
        renderItem={renderWordItem}
        keyExtractor={(item) => String(item.id || item.german || item.word)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Kelime bulunamadı' : 'Henüz kelime yok'}
            </Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {selectedWord && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleRow}>
                      <Text style={styles.modalWord}>
                        {selectedWord.article && (
                          <Text style={styles.modalArticle}>{selectedWord.article} </Text>
                        )}
                        {selectedWord.german || selectedWord.word}
                      </Text>
                      <TouchableOpacity onPress={() => toggleFavorite(selectedWord)}>
                        <Text style={styles.modalStar}>{selectedWord.isFavorite ? '★' : '☆'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.modalMeaning}>{selectedWord.english || selectedWord.meaning_tr}</Text>
                  </View>

                  {selectedWord.audio_path && (
                    <TouchableOpacity
                      style={styles.audioButton}
                      onPress={() => playAudio(selectedWord.audio_path!)}
                      disabled={isPlaying}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[Colors.primary, Colors.primaryLight]}
                        style={styles.audioGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.audioIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                        <Text style={styles.audioText}>Sesli Dinle</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {selectedWord.example_sentence && (
                    <View style={styles.exampleSection}>
                      <LinearGradient
                        colors={[Colors.backgroundTertiary, Colors.backgroundSecondary]}
                        style={styles.exampleGradient}
                      >
                        <Text style={styles.exampleDE}>{selectedWord.example_sentence}</Text>
                        {selectedWord.example_translation && (
                          <Text style={styles.exampleTR}>{selectedWord.example_translation}</Text>
                        )}
                      </LinearGradient>
                    </View>
                  )}

                  <View style={styles.modalFooter}>
                    <View style={styles.progressIndicator}>
                      {[0, 1, 2].map((i) => (
                        <View key={i} style={styles.dotWrapper}>
                          {(selectedWord.knownCount || 0) > i ? (
                            <LinearGradient
                              colors={['#58CC02', '#7ED321']}
                              style={styles.dotFilled}
                            />
                          ) : (
                            <View style={styles.dotEmpty} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  
  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  headerCount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerLabel: {
    fontSize: 14,
    color: Colors.textTertiary,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    padding: 0,
  },
  clearIcon: {
    fontSize: 28,
    color: Colors.textTertiary,
    fontWeight: '200',
  },

  // Filters
  filtersWrapper: {
    marginBottom: 16,
  },
  filtersScroll: {
    paddingHorizontal: 24,
  },
  filterChip: {
    marginRight: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  filterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterIcon: {
    fontSize: 16,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterLabelActive: {
    color: Colors.textPrimary,
  },

  // Word Cards - Focus on Content
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  wordCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardWrapper: {
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  wordSection: {
    flex: 1,
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  wordTitleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordGerman: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    flexShrink: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wordArticle: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
  },
  favoriteStar: {
    fontSize: 24,
    color: Colors.warning,
    marginLeft: 12,
  },
  wordMeaning: {
    fontSize: 17,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontWeight: '500',
  },
  progressMini: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.backgroundTertiary,
  },
  miniDotFilled: {
    backgroundColor: Colors.success,
  },

  // Empty State
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textTertiary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalWord: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.7,
  },
  modalArticle: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalStar: {
    fontSize: 32,
    color: Colors.warning,
  },
  modalMeaning: {
    fontSize: 18,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  audioButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  audioGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  audioIcon: {
    fontSize: 20,
  },
  audioText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exampleSection: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  exampleGradient: {
    padding: 20,
  },
  exampleDE: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 24,
  },
  exampleTR: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  modalFooter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  dotWrapper: {
    width: 16,
    height: 16,
  },
  dotFilled: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotEmpty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 2,
    borderColor: Colors.border,
  },
});
