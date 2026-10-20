import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { useMockMode } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';

export function SplashScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isMockMode, toggleMockMode } = useMockMode();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleGoLogin = () => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const handleGoIntro = () => {
    router.push('/introduction');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* 1. Ambient Glow Layers */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowCenter} pointerEvents="none" />

      {/* Decorative stars */}
      <View style={[styles.star, { top: '18%', left: '12%', opacity: 0.4 }]} />
      <View style={[styles.star, { top: '12%', left: '28%', width: 4, height: 4, backgroundColor: '#ffdf9f', opacity: 0.8 }]} />
      <View style={[styles.star, { top: '14%', right: '18%', opacity: 0.5 }]} />
      <View style={[styles.star, { top: '28%', right: '26%', width: 5, height: 5, backgroundColor: '#f9bd22', opacity: 0.6 }]} />
      <View style={[styles.star, { top: '65%', left: '15%', opacity: 0.6 }]} />
      <View style={[styles.star, { top: '72%', right: '22%', opacity: 0.5 }]} />

      {/* 2. Top Bar Connection Status */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.connectionChip}
          onPress={() => toggleMockMode()}
          activeOpacity={0.8}
          accessibilityLabel="Chuyển chế độ kết nối"
          accessibilityRole="button"
        >
          <View
            style={[
              styles.pingDot,
              isMockMode ? { backgroundColor: colors.secondaryContainer } : null,
            ]}
          />
          <Text style={styles.connectionText}>
            {isMockMode ? 'Chế độ Mock (Offline)' : t('splash.connectionReady')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Center Hero Identity */}
      <View style={styles.heroSection}>
        {/* Glow Wrapped App Icon */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoAuraOuter} />
          <View style={styles.logoAuraInner} />
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Brand Typography */}
        <Text style={styles.brandTitle}>{t('common.appName')}</Text>

        {/* Slogan */}
        <Text style={styles.slogan}>{t('splash.slogan')}</Text>

        {/* Micro Trust Badges */}
        <View style={styles.trustBadgesRow}>
          <View style={styles.trustBadge}>
            <ShieldCheck size={14} color={colors.secondaryFixed} />
            <Text style={styles.trustBadgeText}>{t('splash.badgeTransparency')}</Text>
          </View>
          <View style={styles.trustBadge}>
            <Zap size={14} color={colors.secondaryFixed} />
            <Text style={styles.trustBadgeText}>{t('splash.badgeConvenience')}</Text>
          </View>
        </View>
      </View>

      {/* 4. Bottom Actions & Status Section */}
      <View style={styles.bottomSection}>
        {/* Lunar Loader Status */}
        <View style={styles.loaderPill}>
          <ActivityIndicator size="small" color={colors.secondaryFixedDim} />
          <Text style={styles.loaderText}>{t('splash.loadingLivingSpace')}</Text>
        </View>

        {/* Primary CTA: Direct Login / Dashboard */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleGoLogin}
          activeOpacity={0.85}
          accessibilityLabel="Bắt đầu sử dụng"
          accessibilityRole="button"
        >
          <Text style={styles.ctaButtonText}>
            {isAuthenticated ? 'Vào trang quản trị' : 'Đăng nhập ngay'}
          </Text>
          <ArrowRight size={18} color={colors.onPrimary} />
        </TouchableOpacity>

        {/* Secondary: Intro tour */}
        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.introTourButton}
            onPress={handleGoIntro}
            activeOpacity={0.7}
          >
            <Text style={styles.introTourText}>Khám phá tính năng (Giới thiệu)</Text>
          </TouchableOpacity>
        )}

        {/* App Version Footer */}
        <Text style={styles.versionFooter}>{t('splash.versionInfo')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.inverseSurface,
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.base,
    paddingBottom: tokens.spacing['2xl'],
  },
  glowTop: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primaryContainer,
    opacity: 0.15,
  },
  glowCenter: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.secondaryContainer,
    opacity: 0.12,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  topBar: {
    width: '100%',
    alignItems: 'flex-end',
    zIndex: 10,
  },
  connectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
    backgroundColor: 'rgba(65, 72, 94, 0.4)',
  },
  pingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
  },
  connectionText: {
    ...tokens.typography.caption,
    color: colors.secondaryFixed,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xl,
  },
  logoAuraOuter: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255, 195, 41, 0.2)',
  },
  logoAuraInner: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(53, 37, 205, 0.3)',
  },
  logoContainer: {
    width: 112,
    height: 112,
    borderRadius: tokens.radii['2xl'],
    overflow: 'hidden',
    ...tokens.shadows.lg,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    ...tokens.typography.display,
    color: colors.inverseOnSurface,
    marginBottom: tokens.spacing.xs,
    textAlign: 'center',
  },
  slogan: {
    ...tokens.typography.bodyBase,
    color: colors.tertiaryFixedDim,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: tokens.radii.full,
    backgroundColor: 'rgba(88, 96, 118, 0.5)',
  },
  trustBadgeText: {
    ...tokens.typography.caption,
    color: colors.inverseOnSurface,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: tokens.spacing.base,
    zIndex: 10,
  },
  loaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radii.full,
    backgroundColor: 'rgba(88, 96, 118, 0.3)',
  },
  loaderText: {
    ...tokens.typography.caption,
    color: colors.surfaceContainerHigh,
    letterSpacing: 0.3,
  },
  ctaButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.md,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    ...tokens.shadows.md,
  },
  ctaButtonText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  versionFooter: {
    ...tokens.typography.caption,
    color: 'rgba(190, 198, 224, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  introTourButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  introTourText: {
    ...tokens.typography.caption,
    color: colors.inverseOnSurface,
    textDecorationLine: 'underline',
  },
});
