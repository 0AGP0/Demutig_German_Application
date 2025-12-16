/**
 * Modern Minimal Koyu Tema - Duolingo Tarzı Teşvik Edici
 * Koyu arka plan üzerinde renkli, canlı vurgular ve gamification elementleri
 */

export const Colors = {
  // Arka planlar - Modern koyu tonlar
  background: '#0A0A0A', // Çok koyu siyah
  backgroundSecondary: '#121212', // Koyu gri-siyah
  backgroundTertiary: '#1A1A1A', // Orta koyu gri
  
  // Kartlar ve yüzeyler - Koyu ama yumuşak
  card: '#1E1E1E', // Koyu kart
  cardHover: '#252525', // Hover durumu
  cardBorder: '#2A2A2A', // Kart kenarları
  
  // Vurgu renkleri - Duolingo tarzı canlı renkler (koyu temada daha parlak)
  primary: '#58CC02', // Duolingo yeşili - başarı
  primaryLight: '#7ED321',
  primaryDark: '#4CAF00',
  
  // Durum renkleri - Canlı ve dikkat çekici
  success: '#58CC02', // Duolingo yeşili
  successLight: '#7ED321',
  error: '#FF3B30', // Kırmızı
  errorLight: '#FF6B6B',
  warning: '#FF9500', // Turuncu - Streak için
  warningLight: '#FFB84D',
  info: '#1CB0F6', // Mavi
  infoLight: '#4FC3F7',
  
  // Metin renkleri - Açık tonlar (koyu arka plan için)
  textPrimary: '#FFFFFF', // Beyaz
  textSecondary: '#E5E5E5', // Açık gri
  textTertiary: '#B0B0B0', // Orta gri
  textMuted: '#808080', // Koyu gri
  
  // Seviye renkleri - Canlı ve farklılaştırıcı
  levelA1: '#58CC02', // Yeşil - Başlangıç
  levelA2: '#1CB0F6', // Mavi - Orta
  levelB1: '#FF9500', // Turuncu - İleri
  levelB2: '#CE82FF', // Mor - İleri seviye
  
  // Özel Duolingo renkleri - Teşvik edici
  streak: '#FF9500', // Turuncu - Streak için
  streakLight: '#FFB84D',
  achievement: '#CE82FF', // Mor - Başarı rozetleri
  achievementLight: '#E1A5FF',
  
  // Border ve divider - Koyu tonlar
  border: '#2A2A2A',
  divider: '#1F1F1F',
  
  // Shadow - Koyu tema için optimize edilmiş
  shadow: 'rgba(0, 0, 0, 0.5)',
  shadowLight: 'rgba(0, 0, 0, 0.3)',
  shadowColored: 'rgba(88, 204, 2, 0.4)', // Yeşil gölge (daha belirgin)
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Typography = {
  h1: {
    fontSize: 36,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  // Duolingo tarzı büyük, teşvik edici metinler
  display: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  displayLarge: {
    fontSize: 64,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
    letterSpacing: -1.5,
  },
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  // Duolingo tarzı renkli gölgeler - Koyu temada daha belirgin
  colored: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  streak: {
    shadowColor: Colors.streak,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
};

