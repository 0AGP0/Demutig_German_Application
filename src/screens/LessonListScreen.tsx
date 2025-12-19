import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { LessonService } from '../services/LessonService';
import { ProgressService } from '../services/ProgressService';
import { StorageService } from '../services/StorageService';
import { Lesson } from '../models/Lesson';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

export default function LessonListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonStatuses, setLessonStatuses] = useState<Record<string, 'locked' | 'in_progress' | 'completed' | 'new'>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mevcut seviyeyi al
      const progress = await ProgressService.calculateProgress();
      const level = progress.current_level;
      setCurrentLevel(level);

      // Tüm erişilebilen seviyelerin derslerini yükle
      const allLevels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
      const currentLevelIndex = allLevels.indexOf(level);
      const accessibleLevels = allLevels.slice(0, currentLevelIndex + 1);

      const allLessons: Lesson[] = [];
      for (const lvl of accessibleLevels) {
        const levelLessons = await LessonService.loadLessons(lvl);
        console.log(`📚 LessonListScreen: Loaded ${levelLessons.length} lessons for ${lvl}`);
        allLessons.push(...levelLessons);
      }

      console.log(`📚 LessonListScreen: Total lessons loaded: ${allLessons.length}`);
      setLessons(allLessons);

      // Her dersin durumunu kontrol et - cache'i bypass et
      StorageService.clearCache();
      const statuses: Record<string, 'locked' | 'in_progress' | 'completed' | 'new'> = {};
      
      // Tüm ders progress'lerini bir kere al (cache bypass ile)
      const allProgress = await LessonService.getAllLessonProgress();
      console.log('📊 All lesson progress loaded:', Object.keys(allProgress).length, 'lessons');
      
      for (const lesson of allLessons) {
        const status = await LessonService.getLessonStatus(lesson.lesson_id, allLessons);
        statuses[lesson.lesson_id] = status;
        const progress = allProgress[lesson.lesson_id];
        console.log('📚 Lesson status:', lesson.lesson_id, '=', status, 'progress completed:', progress?.completed);
      }
      setLessonStatuses(statuses);
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Navigation listener - ders tamamlandığında yeniden yükle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Navigation'dan geri dönünce verileri yenile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleLessonPress = (lesson: Lesson) => {
    const status = lessonStatuses[lesson.lesson_id];
    if (status === 'locked') return;
    
    navigation.navigate('Lesson', { lessonId: lesson.lesson_id });
  };

  const getStatusIcon = (status: 'locked' | 'in_progress' | 'completed' | 'new') => {
    switch (status) {
      case 'locked':
        return '🔒';
      case 'in_progress':
        return '⏳';
      case 'completed':
        return '✅';
      default:
        return '';
    }
  };

  const getStatusText = (status: 'locked' | 'in_progress' | 'completed' | 'new') => {
    switch (status) {
      case 'locked':
        return 'Kilitli';
      case 'in_progress':
        return 'Devam Ediyor';
      case 'completed':
        return 'Tamamlandı';
      default:
        return 'Yeni';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1':
        return Colors.levelA1;
      case 'A2':
        return Colors.levelA2;
      case 'B1':
        return Colors.levelB1;
      case 'B2':
        return Colors.levelB2;
      default:
        return Colors.primary;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Dersler</Text>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(currentLevel) + '20' }]}>
          <Text style={[styles.levelText, { color: getLevelColor(currentLevel) }]}>
            {currentLevel}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {lessons.map((lesson) => {
          const status = lessonStatuses[lesson.lesson_id] || 'new';
          const isLocked = status === 'locked';
          const levelColor = getLevelColor(lesson.level);

          return (
            <TouchableOpacity
              key={lesson.lesson_id}
              style={[
                styles.lessonCard,
                isLocked && styles.lessonCardLocked,
                status === 'completed' && styles.lessonCardCompleted,
              ]}
              onPress={() => handleLessonPress(lesson)}
              disabled={isLocked}
              activeOpacity={0.7}
            >
              <View style={styles.lessonCardHeader}>
                <View style={styles.lessonCardLeft}>
                  <View style={[styles.lessonNumberBadge, { backgroundColor: levelColor }]}>
                    <Text style={styles.lessonNumberText}>{lesson.lesson_id}</Text>
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonLevel}>{lesson.level} Seviyesi</Text>
                  </View>
                </View>
                <View style={styles.statusContainer}>
                  <Text style={styles.statusIcon}>{getStatusIcon(status)}</Text>
                  <Text style={[styles.statusText, isLocked && styles.statusTextLocked]}>
                    {getStatusText(status)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  levelText: {
    ...Typography.body,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  lessonCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  lessonCardLocked: {
    opacity: 0.6,
    backgroundColor: Colors.backgroundTertiary,
  },
  lessonCardCompleted: {
    borderWidth: 2,
    borderColor: Colors.success + '40',
  },
  lessonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonNumberBadge: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  lessonNumberText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  lessonLevel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusTextLocked: {
    color: Colors.textTertiary,
  },
});

