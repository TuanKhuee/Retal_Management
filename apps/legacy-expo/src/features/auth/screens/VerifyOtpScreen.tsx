import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  KeyRound,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { HeaderBar } from '../components/HeaderBar';
import { OtpInputGroup } from '../components/OtpInputGroup';
import { useOtpCountdown } from '../hooks/useOtpCountdown';
import { useForgotPasswordMutation, useVerifyOtpMutation } from '../api/authApi';

export function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; otp?: string }>();
  const phone = params.phone || '';
  const initialOtp = params.otp || '';

  const forgotPasswordMutation = useForgotPasswordMutation();
  const verifyOtpMutation = useVerifyOtpMutation();

  const [otp, setOtp] = useState(initialOtp);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { seconds, isFinished, restart } = useOtpCountdown(45);

  const formatMaskedPhone = (raw: string) => {
    if (!raw) return 'số điện thoại của bạn';
    if (raw.length >= 9) {
      return `${raw.slice(0, 4)} *** ${raw.slice(-3)}`;
    }
    return raw;
  };

  const handleResendOtp = async () => {
    if (!isFinished) return;
    setErrorMessage(null);
    try {
      const res = await forgotPasswordMutation.mutateAsync({ identifier: phone });
      restart(45);
      if (res.otp) {
        setOtp(res.otp);
      }
      setSuccessMessage('Đã gửi lại mã OTP mới!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi lại mã OTP. Vui lòng thử lại!';
      setErrorMessage(msg);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số mã xác thực OTP.');
      return;
    }

    setErrorMessage(null);
    try {
      await verifyOtpMutation.mutateAsync({
        identifier: phone,
        otp,
      });

      // Navigate to step 3
      router.push({
        pathname: '/reset-password',
        params: {
          phone,
          token: otp,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mã xác thực OTP không đúng hoặc đã hết hạn.';
      setErrorMessage(msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <HeaderBar title="Xác thực OTP" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Title Row & Current Step Badge */}
          <View style={styles.titleRow}>
            <Text style={styles.screenTitle}>Nhập mã xác thực</Text>
            <View style={styles.stepBadge}>
              <View style={styles.stepPulseDot} />
              <Text style={styles.stepBadgeText}>Bước 2 / 3</Text>
            </View>
          </View>
          <Text style={styles.screenSubtitle}>
            Mã OTP 6 chữ số đã được gửi đến số điện thoại{' '}
            <Text style={{ fontWeight: '700', color: colors.onSurface }}>
              {formatMaskedPhone(phone)}
            </Text>
            .
          </Text>

          {/* Test helper banner if OTP is available in dev/demo */}
          {initialOtp ? (
            <View style={styles.testBadge}>
              <Sparkles size={16} color={colors.secondaryContainer} />
              <Text style={styles.testBadgeText}>
                Mã OTP nhận được: <Text style={{ fontWeight: '700' }}>{initialOtp}</Text>
              </Text>
            </View>
          ) : null}

          {/* Success Toast */}
          {successMessage && (
            <View style={styles.successToast}>
              <CheckCircle2 size={20} color={colors.status.vacant} />
              <Text style={styles.toastDesc}>{successMessage}</Text>
            </View>
          )}

          {/* Error Toast */}
          {errorMessage && (
            <View style={styles.errorToast}>
              <AlertCircle size={22} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorToastTitle}>Lỗi xác thực</Text>
                <Text style={styles.errorToastDesc}>{errorMessage}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setErrorMessage(null)}
                accessibilityLabel="Đóng thông báo"
                accessibilityRole="button"
              >
                <X size={16} color={colors.onErrorContainer} />
              </TouchableOpacity>
            </View>
          )}

          {/* 2. Step Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack} />
            <View style={[styles.progressFill, { width: '50%' }]} />
            <View style={styles.nodesRow}>
              <View style={[styles.nodeCircle, styles.nodeActive]}>
                <Text style={[styles.nodeText, styles.nodeTextActive]}>1</Text>
              </View>
              <View style={[styles.nodeCircle, styles.nodeActive]}>
                <Text style={[styles.nodeText, styles.nodeTextActive]}>2</Text>
              </View>
              <View style={[styles.nodeCircle, styles.nodeInactive]}>
                <Text style={styles.nodeText}>3</Text>
              </View>
            </View>
          </View>

          {/* 3. Step 2 Card: OTP Entry */}
          <View style={styles.stepCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: 'rgba(255, 223, 159, 0.4)' },
                  ]}
                >
                  <KeyRound size={20} color={colors.secondary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Mã xác thực 6 số</Text>
                  <Text style={styles.cardSub}>Nhập mã gồm 6 chữ số</Text>
                </View>
              </View>
              <View style={styles.statusBadgeActive}>
                <Text style={styles.statusBadgeTextActive}>Bước hiện tại</Text>
              </View>
            </View>

            <View style={{ marginVertical: tokens.spacing.md }}>
              <OtpInputGroup value={otp} onChange={setOtp} />
            </View>

            {/* Resend OTP Row */}
            <View style={styles.resendRow}>
              <View style={styles.countdownGroup}>
                <Clock size={15} color={colors.outline} />
                <Text style={styles.countdownLabel}>
                  Gửi lại sau{' '}
                  <Text style={styles.countdownSec}>{seconds}s</Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={!isFinished || forgotPasswordMutation.isPending}
                activeOpacity={0.7}
                accessibilityLabel="Gửi lại mã OTP"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.resendButtonText,
                    isFinished && styles.resendButtonActive,
                  ]}
                >
                  {forgotPasswordMutation.isPending ? 'Đang gửi...' : 'Gửi lại mã'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                (verifyOtpMutation.isPending || otp.length < 6) &&
                  styles.primaryActionButtonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={verifyOtpMutation.isPending || otp.length < 6}
              activeOpacity={0.85}
              accessibilityLabel="Xác nhận mã OTP"
              accessibilityRole="button"
            >
              {verifyOtpMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryActionText}>Xác nhận mã OTP</Text>
                  <CheckCircle2 size={18} color={colors.onPrimary} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Change phone button */}
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color={colors.primary} />
            <Text style={styles.backText}>Đổi số điện thoại nhận mã khác</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.margin,
    paddingBottom: tokens.spacing['4xl'],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.spacing.md,
    marginBottom: 4,
  },
  screenTitle: {
    ...tokens.typography.titleMd,
    color: colors.onSurface,
  },
  screenSubtitle: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: tokens.spacing.base,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.full,
    gap: 6,
  },
  stepPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  stepBadgeText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  testBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92, 225, 230, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(92, 225, 230, 0.3)',
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
    gap: 8,
  },
  testBadgeText: {
    fontSize: 13,
    color: colors.secondaryContainer,
  },
  progressContainer: {
    position: 'relative',
    height: 36,
    justifyContent: 'center',
    marginBottom: tokens.spacing.lg,
  },
  progressTrack: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 2,
  },
  progressFill: {
    position: 'absolute',
    left: 20,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  nodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.sm,
  },
  nodeActive: {
    backgroundColor: colors.primary,
  },
  nodeInactive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  nodeText: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.outline,
  },
  nodeTextActive: {
    color: colors.onPrimary,
  },
  stepCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...tokens.typography.bodyBaseMedium,
    color: colors.onSurface,
  },
  cardSub: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(92, 225, 230, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radii.sm,
  },
  statusBadgeTextActive: {
    ...tokens.typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  countdownGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownLabel: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
  countdownSec: {
    color: colors.primary,
    fontWeight: '700',
  },
  resendButtonText: {
    ...tokens.typography.caption,
    color: colors.outline,
    fontWeight: '600',
  },
  resendButtonActive: {
    color: colors.primary,
  },
  primaryActionButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...tokens.shadows.sm,
  },
  primaryActionButtonDisabled: {
    opacity: 0.6,
  },
  primaryActionText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.base,
    gap: 10,
  },
  toastDesc: {
    ...tokens.typography.caption,
    color: colors.onSurface,
    fontWeight: '600',
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.base,
    gap: 10,
  },
  errorToastTitle: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.onErrorContainer,
  },
  errorToastDesc: {
    ...tokens.typography.caption,
    color: colors.onErrorContainer,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.spacing.sm,
  },
  backText: {
    ...tokens.typography.bodySmMedium,
    color: colors.primary,
  },
});
