import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Moon,
  ArrowRight,
  Camera,
  QrCode,
  Wrench,
  Zap,
  Receipt,
  CheckCircle2,
  Key,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

export function IntroductionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      badgeIcon: Zap,
      badgeText: t('intro.slide1.tag'),
      chipIcon: Camera,
      chipText: t('intro.slide1.chip'),
      title: t('intro.slide1.title'),
      desc: t('intro.slide1.desc'),
    },
    {
      badgeIcon: Receipt,
      badgeText: t('intro.slide2.tag'),
      chipIcon: QrCode,
      chipText: t('intro.slide2.chip'),
      title: t('intro.slide2.title'),
      desc: t('intro.slide2.desc'),
    },
    {
      badgeIcon: CheckCircle2,
      badgeText: t('intro.slide3.tag'),
      chipIcon: Wrench,
      chipText: t('intro.slide3.chip'),
      title: t('intro.slide3.title'),
      desc: t('intro.slide3.desc'),
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      router.push('/login');
    }
  };

  const handleSkip = () => {
    router.push('/login');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleActivate = () => {
    router.push('/set-password');
  };

  const current = slides[currentSlide];
  const BadgeIcon = current.badgeIcon;
  const ChipIcon = current.chipIcon;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Top Utility Bar: Brand Pill & Skip */}
        <View style={styles.topUtilityBar}>
          <View style={styles.brandPill}>
            <Moon size={16} color={colors.primary} fill={colors.primary} />
            <Text style={styles.brandPillText}>MOONLIGHT</Text>
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            accessibilityLabel="Bỏ qua phần giới thiệu"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>{t('intro.skip')}</Text>
            <ArrowRight size={16} color={colors.tertiary} />
          </TouchableOpacity>
        </View>

        {/* 2. Carousel Card */}
        <View style={styles.carouselContainer}>
          <View style={styles.imageCard}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida/AEtjO1ViYP29aN2T55CClf3voiqmPRCQdgWD61n9x32Zp6SNsJbHzXCbzpbQdNlvHKYqESIAatC_9t5D36sz1ZPhW4QrKzEFG5rbdD3_LbZXRChLr2aA6DjXuEM0wTo747GaEMThC7_7O-E6-DIy5EE349jZjF54RY-CrLbrF-oLkuB1bts73rsotv2lT7uW4y7Y5VJl6Q_P2YDJQKsidpAJEuG2JGncukRLU9EBVhaAbn-Q',
              }}
              defaultSource={require('../../../../assets/images/icon.png')}
              style={styles.cardImage}
              resizeMode="cover"
            />

            {/* Bottom floating badge */}
            <View style={styles.floatingBadgeBottom}>
              <BadgeIcon size={14} color={colors.secondaryFixed} />
              <Text style={styles.floatingBadgeText}>{current.badgeText}</Text>
            </View>

            {/* Top right step counter */}
            <View style={styles.floatingCounterTop}>
              <View style={styles.counterDot} />
              <Text style={styles.counterText}>
                {currentSlide + 1} / {slides.length}
              </Text>
            </View>
          </View>

          {/* Dynamic Slide Content */}
          <View style={styles.slideContent}>
            <View style={styles.chipWrapper}>
              <ChipIcon size={14} color={colors.primary} />
              <Text style={styles.chipText}>{current.chipText}</Text>
            </View>

            <Text style={styles.slideTitle}>{current.title}</Text>
            <Text style={styles.slideDesc}>{current.desc}</Text>
          </View>

          {/* Pagination Dots */}
          <View style={styles.paginationRow}>
            {slides.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dot,
                  index === currentSlide ? styles.dotActive : styles.dotInactive,
                ]}
                onPress={() => setCurrentSlide(index)}
                accessibilityLabel={`Chuyển sang trang ${index + 1}`}
                accessibilityRole="button"
              />
            ))}
          </View>
        </View>

        {/* 3. Bottom CTA Panel */}
        <View style={styles.bottomCtaPanel}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNext}
            activeOpacity={0.85}
            accessibilityLabel={currentSlide === slides.length - 1 ? 'Bắt đầu ngay' : 'Tiếp theo'}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>
              {currentSlide === slides.length - 1
                ? t('intro.getStarted')
                : t('intro.next')}
            </Text>
            <ArrowRight size={18} color={colors.onPrimary} />
          </TouchableOpacity>

          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.loginLinkRow}
              onPress={handleLogin}
              activeOpacity={0.7}
              accessibilityLabel="Đăng nhập ngay"
              accessibilityRole="button"
            >
              <Text style={styles.alreadyAccountText}>
                {t('intro.alreadyHaveAccount')}{' '}
              </Text>
              <Text style={styles.loginLinkText}>{t('intro.loginNow')}</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.tenantButton}
              onPress={handleActivate}
              activeOpacity={0.8}
              accessibilityLabel="Khách thuê được mời? Kích hoạt tài khoản"
              accessibilityRole="button"
            >
              <Key size={16} color={colors.secondary} />
              <Text style={styles.tenantButtonText}>{t('intro.tenantInvite')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: tokens.spacing.xl,
  },
  topUtilityBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xs,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radii.full,
    ...tokens.shadows.sm,
  },
  brandPillText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radii.DEFAULT,
  },
  skipText: {
    ...tokens.typography.bodySmMedium,
    color: colors.tertiary,
  },
  carouselContainer: {
    paddingHorizontal: tokens.spacing.margin,
    marginTop: tokens.spacing.xs,
  },
  imageCard: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: tokens.radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.inverseSurface,
    ...tokens.shadows.md,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  floatingBadgeBottom: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radii.full,
    backgroundColor: 'rgba(41, 48, 64, 0.88)',
    ...tokens.shadows.sm,
  },
  floatingBadgeText: {
    ...tokens.typography.caption,
    color: colors.inverseOnSurface,
    fontWeight: '500',
  },
  floatingCounterTop: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    ...tokens.shadows.sm,
  },
  counterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondaryFixedDim,
  },
  counterText: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.onSurface,
  },
  slideContent: {
    alignItems: 'center',
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.sm,
    marginTop: tokens.spacing.xl,
  },
  chipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: tokens.radii.full,
    backgroundColor: colors.surfaceContainerHigh,
    marginBottom: tokens.spacing.sm,
  },
  chipText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  slideTitle: {
    ...tokens.typography.titleMd,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: tokens.spacing.xs,
  },
  slideDesc: {
    ...tokens.typography.bodyBase,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: tokens.spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.primaryContainer,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.outlineVariant,
  },
  bottomCtaPanel: {
    paddingHorizontal: tokens.spacing.margin,
    marginTop: tokens.spacing['2xl'],
    gap: 14,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  primaryButtonText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  linksContainer: {
    alignItems: 'center',
    gap: 8,
  },
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  alreadyAccountText: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  loginLinkText: {
    ...tokens.typography.bodySmMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dividerLine: {
    width: 48,
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dividerText: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
  tenantButton: {
    width: '100%',
    height: 44,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tenantButtonText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onSurface,
    fontWeight: '500',
  },
});
