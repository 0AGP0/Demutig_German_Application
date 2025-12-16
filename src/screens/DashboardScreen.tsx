import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressService } from '../services/ProgressService';
import { StorageService } from '../services/StorageService';
import { TestService } from '../services/TestService';
import { UserProgress } from '../models/Progress';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [todayWordsCount, setTodayWordsCount] = useState(0);
  const [todaySentencesCount, setTodaySentencesCount] = useState(0);
  const [reviewWordsCount, setReviewWordsCount] = useState(0);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      let userProgress = await ProgressService.calculateProgress();
      const streak = await StorageService.updateStreak();
      userProgress.streak_days = streak;
      await StorageService.saveProgress(userProgress);
      setProgress(userProgress);

      const today = new Date().toDateString();
      const allVocab = await StorageService.getVocabulary();
      const allSentences = await StorageService.getSentences();

      // Bugün değerlendirilen kelimeleri say (Vocabulary ekranında sağa/sola swipe edilenler)
      const todayVocab = allVocab.filter((v: any) => {
        // Önce daily_reviewed_date'e bak (yeni sistem), yoksa last_reviewed'e bak (eski veriler için)
        const reviewDate = v.daily_reviewed_date || v.last_reviewed;
        if (!reviewDate) return false;
        const reviewDateString = new Date(reviewDate).toDateString();
        return reviewDateString === today;
      });

      const todaySentences = allSentences.filter((s: any) => {
        // Önce daily_reviewed_date'e bak (yeni sistem), yoksa practiced_date'e bak (eski veriler için)
        const reviewDate = s.daily_reviewed_date || s.practiced_date;
        if (!reviewDate) return false;
        return new Date(reviewDate).toDateString() === today;
      });

      setTodayWordsCount(todayVocab.length);
      setTodaySentencesCount(todaySentences.length);

      // Tekrar zamanı gelen kelimeleri say
      const reviewWords = await TestService.getWordsForTest(userProgress.current_level, 'review');
      setReviewWordsCount(reviewWords.length);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const levelColors = useMemo<Record<'A1' | 'A2' | 'B1' | 'B2', string>>(() => ({
    A1: Colors.levelA1,
    A2: Colors.levelA2,
    B1: Colors.levelB1,
    B2: Colors.levelB2,
  }), []);
  
  const currentColor = useMemo(() => {
    if (!progress) return Colors.primary;
    return levelColors[progress.current_level as 'A1' | 'A2' | 'B1' | 'B2'] || Colors.primary;
  }, [progress?.current_level, levelColors]);
  
  const { wordsProgress, sentencesProgress, wordsCompleted, sentencesCompleted } = useMemo(() => {
    if (!progress) {
      return {
        wordsProgress: 0,
        sentencesProgress: 0,
        wordsCompleted: false,
        sentencesCompleted: false,
      };
    }
    const wProgress = (todayWordsCount / (progress.daily_goal.words || 10)) * 100;
    const sProgress = (todaySentencesCount / (progress.daily_goal.sentences || 5)) * 100;
    return {
      wordsProgress: wProgress,
      sentencesProgress: sProgress,
      wordsCompleted: wProgress >= 100,
      sentencesCompleted: sProgress >= 100,
    };
  }, [todayWordsCount, todaySentencesCount, progress?.daily_goal]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  if (loading || !progress) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* STREAK KARTI */}
      <TouchableOpacity
        style={styles.streakCard}
        onPress={() => {
          navigation.navigate('Calendar');
        }}
        activeOpacity={0.8}
      >
        <View style={styles.streakCardContent}>
          <View style={styles.streakLeft}>
            <View style={styles.streakIconContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
            </View>
            <View style={styles.streakInfo}>
              <Text style={styles.streakLabel}>Günlük Seri</Text>
              <Text style={styles.streakNumber}>{progress.streak_days}</Text>
              <Text style={styles.streakSubtext}>Gün</Text>
            </View>
          </View>
          <Text style={styles.streakArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* BUGÜNÜN HEDEFLERİ */}
      <View style={styles.goalsSection}>
        <Text style={styles.sectionTitle}>Bugünün Hedefleri</Text>
        <View style={styles.goalsGrid}>
          {/* Kelime Hedefi */}
          <View style={styles.goalCard}>
            <View style={styles.goalCardHeader}>
              <View style={[styles.goalIconContainer, wordsCompleted && styles.goalIconCompleted]}>
                <Text style={styles.goalEmoji}>{wordsCompleted ? '✅' : '📚'}</Text>
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalLabel}>Kelime</Text>
                <View style={styles.goalNumbers}>
                  <Text style={styles.goalNumber}>{todayWordsCount}</Text>
                  <Text style={styles.goalDivider}>/</Text>
                  <Text style={styles.goalTarget}>{progress.daily_goal.words || 10}</Text>
                </View>
              </View>
            </View>
            <View style={styles.goalProgressBarContainer}>
              <View 
                style={[
                  styles.goalProgressBar,
                  { width: `${Math.min(100, wordsProgress)}%` },
                  wordsCompleted && styles.goalProgressBarCompleted
                ]} 
              />
            </View>
          </View>

          {/* Cümle Hedefi */}
          <View style={styles.goalCard}>
            <View style={styles.goalCardHeader}>
              <View style={[styles.goalIconContainer, sentencesCompleted && styles.goalIconCompleted]}>
                <Text style={styles.goalEmoji}>{sentencesCompleted ? '✅' : '💬'}</Text>
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalLabel}>Cümle</Text>
                <View style={styles.goalNumbers}>
                  <Text style={styles.goalNumber}>{todaySentencesCount}</Text>
                  <Text style={styles.goalDivider}>/</Text>
                  <Text style={styles.goalTarget}>{progress.daily_goal.sentences || 5}</Text>
                </View>
              </View>
            </View>
            <View style={styles.goalProgressBarContainer}>
              <View 
                style={[
                  styles.goalProgressBar,
                  { width: `${Math.min(100, sentencesProgress)}%` },
                  sentencesCompleted && styles.goalProgressBarCompleted
                ]} 
              />
            </View>
          </View>
        </View>
      </View>

      {/* TEKRAR ZAMANI KARTI */}
      {reviewWordsCount > 0 && (
        <View style={styles.reviewSection}>
          <TouchableOpacity
            style={styles.reviewCard}
            onPress={() => {
              navigation.navigate('Test');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.achievement, Colors.achievementLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reviewCardGradient}
            >
              <Text style={styles.reviewEmoji}>🔄</Text>
              <Text style={styles.reviewTitle}>Tekrar Zamanı</Text>
              <Text style={styles.reviewNumber}>{reviewWordsCount}</Text>
              <Text style={styles.reviewLabel}>Kelime tekrar bekliyor</Text>
              <Text style={styles.reviewHint}>Teste gitmek için tıkla →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* İSTATİSTİKLER - Grid Layout */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Toplam İlerleme</Text>
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.primary + '20', Colors.primary + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={[styles.statIconContainer, { backgroundColor: Colors.primary + '30' }]}>
                <Text style={styles.statIcon}>📖</Text>
              </View>
              <Text style={styles.statNumber}>{progress.total_words_learned}</Text>
              <Text style={styles.statLabel}>Öğrenilen Kelime</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.info + '20', Colors.info + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={[styles.statIconContainer, { backgroundColor: Colors.info + '30' }]}>
                <Text style={styles.statIcon}>💬</Text>
              </View>
              <Text style={styles.statNumber}>{progress.total_sentences_practiced}</Text>
              <Text style={styles.statLabel}>Okunan Cümle</Text>
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </View>

      {/* SEVİYE İLERLEMESİ - Duolingo tarzı renkli progress */}
      <View style={styles.levelsSection}>
        <View style={styles.levelsHeader}>
          <Text style={styles.sectionTitle}>Seviye İlerlemesi</Text>
          <View style={[styles.currentLevelBadge, { backgroundColor: currentColor + '20' }]}>
            <Text style={[styles.currentLevelText, { color: currentColor }]}>
              {progress.current_level}
            </Text>
          </View>
        </View>
        
        <View style={styles.levelsList}>
          {(['A1', 'A2', 'B1', 'B2'] as const).map((level, index) => {
            const data = progress.level_progress[level];
            const color = levelColors[level];
            const isCurrent = progress.current_level === level;

            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelCard, isCurrent && styles.levelCardActive]}
                activeOpacity={0.7}
              >
                <View style={styles.levelCardHeader}>
                  <View style={styles.levelCardLeft}>
                    <View style={[styles.levelBadgeCircle, { backgroundColor: color }]}>
                      <Text style={styles.levelBadgeText}>{level}</Text>
                    </View>
                    <View style={styles.levelInfoContainer}>
                      <Text style={[styles.levelLabel, { color: isCurrent ? color : Colors.textSecondary }]}>
                        {level} Seviyesi
                      </Text>
                      <Text style={styles.levelInfo}>
                        {data.vocab_completed} / {data.vocab_target} kelime
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.levelPercent, { color }]}>{data.percentage}%</Text>
                </View>
                <View style={styles.levelProgressBarContainer}>
                  <View style={[styles.levelProgressBar, { backgroundColor: color + '20' }]}>
                    <LinearGradient
                      colors={[color, color + 'CC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.levelProgressFill, { width: `${data.percentage}%` }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
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
  // STREAK KARTI
  streakCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xxl + 20,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  streakCardContent: {
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  streakIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.streak + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakInfo: {
    flex: 1,
  },
  streakLabel: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  streakNumber: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  streakSubtext: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  streakArrow: {
    fontSize: 24,
    color: Colors.textTertiary,
    fontWeight: '300',
  },
  // TEKRAR ZAMANI
  reviewSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  reviewCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.colored,
  },
  reviewCardGradient: {
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  reviewEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  reviewTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    fontWeight: '700',
  },
  reviewNumber: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  reviewLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    opacity: 0.9,
    marginBottom: Spacing.sm,
  },
  reviewHint: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  // HEDEFLER
  goalsSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  goalsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  goalCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalIconCompleted: {
    backgroundColor: Colors.success + '20',
  },
  goalEmoji: {
    fontSize: 20,
  },
  goalInfo: {
    flex: 1,
  },
  goalLabel: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  goalNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  goalNumber: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  goalDivider: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  goalTarget: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  goalProgressBarContainer: {
    height: 6,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  goalProgressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  goalProgressBarCompleted: {
    backgroundColor: Colors.success,
  },
  // İSTATİSTİKLER - Grid Layout
  statsSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  statCardGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statIcon: {
    fontSize: 28,
  },
  statNumber: {
    ...Typography.h1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },
  // SEVİYE İLERLEMESİ
  levelsSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  levelsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  currentLevelBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  currentLevelText: {
    ...Typography.h3,
    fontWeight: 'bold',
  },
  levelsList: {
    gap: Spacing.md,
  },
  levelCard: {
    backgroundColor: Colors.card,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  levelCardActive: {
    borderColor: Colors.primary,
    borderWidth: 3,
    ...Shadows.medium,
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  levelCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  levelBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeText: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  levelInfoContainer: {
    flex: 1,
  },
  levelLabel: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  levelInfo: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  levelPercent: {
    ...Typography.h2,
    fontWeight: 'bold',
  },
  levelProgressBarContainer: {
    marginTop: Spacing.sm,
  },
  levelProgressBar: {
    height: 12,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
});
