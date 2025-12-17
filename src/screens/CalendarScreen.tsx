import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

interface DayData {
  date: Date;
  wordsCount: number;
  sentencesCount: number;
  hasActivity: boolean;
}

export default function CalendarScreen() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCalendarData();
    }, [])
  );

  useEffect(() => {
    // Ay değiştiğinde animasyonlu geçiş
    const animate = async () => {
      // Fade out
      await new Promise(resolve => {
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }).start(resolve);
      });
      
      // Veriyi yükle
      await loadCalendarData();
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };
    
    animate();
  }, [selectedMonth]);

  const loadCalendarData = async (): Promise<void> => {
    try {
      const allVocab = await StorageService.getVocabulary();
      const allSentences = await StorageService.getSentences();
      
      // Seçili ayın ilk ve son gününü hesapla
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Ayın tüm günlerini oluştur
      const days: DayData[] = [];
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateString = date.toDateString();
        
        // Bu gün için kelime sayısı
        const dayWords = allVocab.filter((v: any) => {
          const reviewDate = v.daily_reviewed_date || v.last_reviewed;
          if (!reviewDate) return false;
          return new Date(reviewDate).toDateString() === dateString;
        });
        
        // Bu gün için cümle sayısı
        const daySentences = allSentences.filter((s: any) => {
          const reviewDate = s.daily_reviewed_date || s.practiced_date;
          if (!reviewDate) return false;
          return new Date(reviewDate).toDateString() === dateString;
        });
        
        days.push({
          date,
          wordsCount: dayWords.length,
          sentencesCount: daySentences.length,
          hasActivity: dayWords.length > 0 || daySentences.length > 0,
        });
      }
      
      setCalendarData(days);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };

  const getMonthName = (date: Date) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[date.getMonth()];
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    return days[dayIndex];
  };

  const getDayIntensity = (wordsCount: number, sentencesCount: number) => {
    const total = wordsCount + sentencesCount;
    if (total === 0) return 0;
    if (total <= 5) return 1;
    if (total <= 10) return 2;
    if (total <= 20) return 3;
    return 4;
  };

  const getDayColor = (intensity: number) => {
    switch (intensity) {
      case 0: return '#161b22'; // GitHub tarzı koyu gri (aktivite yok)
      case 1: return '#0e4429'; // En açık yeşil (az aktivite)
      case 2: return '#006d32'; // Orta yeşil
      case 3: return '#26a641'; // Açık yeşil
      case 4: return '#39d353'; // En parlak yeşil (çok aktivite)
      default: return '#161b22';
    }
  };

  // Ayın ilk gününün hafta gününü bul (0 = Pazar, 1 = Pazartesi, ...)
  const firstDayOfWeek = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay();
  // Pazartesi'yi 0 yapmak için düzelt
  const firstDayIndex = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Başlık ve Ay Navigasyonu */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => changeMonth('prev')}
          activeOpacity={0.7}
        >
          <Text style={styles.monthButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.monthInfo}>
          <Text style={styles.monthTitle}>{getMonthName(selectedMonth)}</Text>
          <Text style={styles.yearTitle}>{selectedMonth.getFullYear()}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => changeMonth('next')}
          activeOpacity={0.7}
        >
          <Text style={styles.monthButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Hafta Günleri Başlıkları */}
      <View style={styles.weekDaysHeader}>
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
          <View key={index} style={styles.weekDayHeader}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Takvim Grid - Animasyonlu */}
      <Animated.View 
        style={[
          styles.calendarContainer,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={styles.calendarGrid}>
          {/* Boş hücreler (ayın ilk gününden önceki günler) */}
          {Array.from({ length: firstDayIndex }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.calendarDay} />
          ))}
          
          {/* Günler - GitHub tarzı küçük kareler */}
          {calendarData.map((dayData, index) => {
            const intensity = getDayIntensity(dayData.wordsCount, dayData.sentencesCount);
            const dayColor = getDayColor(intensity);
            const isToday = dayData.date.toDateString() === new Date().toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.calendarDay}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedDay(dayData);
                  setModalVisible(true);
                }}
              >
                <View style={[
                  styles.daySquare, 
                  { backgroundColor: dayColor },
                  isToday && styles.todayBorder
                ]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Açıklama - GitHub tarzı */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Açıklama</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#161b22' }]} />
            <Text style={styles.legendText}>Aktivite yok</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#0e4429' }]} />
            <Text style={styles.legendText}>1-5 öğe</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#006d32' }]} />
            <Text style={styles.legendText}>6-10 öğe</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#26a641' }]} />
            <Text style={styles.legendText}>11-20 öğe</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#39d353' }]} />
            <Text style={styles.legendText}>20+ öğe</Text>
          </View>
        </View>
      </View>

      {/* Toplam İstatistikler */}
      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>Bu Ay Toplam</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {calendarData.reduce((sum, day) => sum + day.wordsCount, 0)}
            </Text>
            <Text style={styles.statLabel}>Kelime</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {calendarData.reduce((sum, day) => sum + day.sentencesCount, 0)}
            </Text>
            <Text style={styles.statLabel}>Cümle</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {calendarData.filter(day => day.hasActivity).length}
            </Text>
            <Text style={styles.statLabel}>Aktif Gün</Text>
          </View>
        </View>
      </View>

      {/* Gün Detay Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedDay && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedDay.date.getDate()} {getMonthName(selectedDay.date)} {selectedDay.date.getFullYear()}
                </Text>
                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatIcon}>📖</Text>
                    <View style={styles.modalStatTextContainer}>
                      <Text style={styles.modalStatNumber}>{selectedDay.wordsCount}</Text>
                      <Text style={styles.modalStatLabel}>Kelime</Text>
                    </View>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatIcon}>💬</Text>
                    <View style={styles.modalStatTextContainer}>
                      <Text style={styles.modalStatNumber}>{selectedDay.sentencesCount}</Text>
                      <Text style={styles.modalStatLabel}>Cümle</Text>
                    </View>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatIcon}>✨</Text>
                    <View style={styles.modalStatTextContainer}>
                      <Text style={styles.modalStatNumber}>
                        {selectedDay.wordsCount + selectedDay.sentencesCount}
                      </Text>
                      <Text style={styles.modalStatLabel}>Toplam</Text>
                    </View>
                  </View>
                </View>
                {!selectedDay.hasActivity && (
                  <Text style={styles.modalNoActivity}>Bu gün aktivite yok</Text>
                )}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Kapat</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl + 20,
    paddingBottom: Spacing.lg,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  monthButtonText: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  yearTitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  weekDayText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  calendarContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: '13.2%',
    aspectRatio: 1,
  },
  daySquare: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#30363d',
    minHeight: 11,
    minWidth: 11,
  },
  todayBorder: {
    borderColor: Colors.primary,
    borderWidth: 2,
    borderRadius: 4,
  },
  legend: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xl,
    ...Shadows.small,
  },
  legendTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statsSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  statsTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.small,
  },
  statNumber: {
    ...Typography.h1,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 400,
    ...Shadows.large,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalStats: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  modalStatIcon: {
    fontSize: 32,
  },
  modalStatTextContainer: {
    flex: 1,
  },
  modalStatNumber: {
    ...Typography.h2,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  modalStatLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  modalNoActivity: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  modalCloseButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  modalCloseButtonText: {
    ...Typography.body,
    color: Colors.background,
    fontWeight: '600',
  },
});


