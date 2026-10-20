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
import { useRouter } from 'expo-router';
import {
  Smartphone,
  Send,
  X,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { HeaderBar } from '../components/HeaderBar';
import { FormInput } from '../components/FormInput';
import { useForgotPasswordMutation } from '../api/authApi';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const forgotPasswordMutation = useForgotPasswordMutation();

  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/[\s\-\.]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 9-10 chữ số).');
      return;
    }

    setErrorMessage(null);
    try {
      const res = await forgotPasswordMutation.mutateAsync({ identifier: cleanPhone });
      setSuccessMessage('Mã xác thực OTP đã được gửi đến số điện thoại của bạn.');
      
      // Navigate to step 2 after brief delay
      setTimeout(() => {
        router.push({
          pathname: '/verify-otp',
          params: {
            phone: cleanPhone,
            otp: res.otp || res.resetToken || '',
          },
        });
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi mã xác thực. Vui lòng thử lại!';
      setErrorMessage(msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <HeaderBar title="Khôi phục tài khoản" onBack={() => router.back()} />

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
            <Text style={styles.screenTitle}>Quên mật khẩu?</Text>
            <View style={styles.stepBadge}>
              <View style={styles.stepPulseDot} />
              <Text style={styles.stepBadgeText}>Bước 1 / 3</Text>
            </View>
          </View>
          <Text style={styles.screenSubtitle}>
            Nhập số điện thoại đã đăng ký tài khoản của bạn để nhận mã xác thực OTP khôi phục mật khẩu.
          </Text>

          {/* Success Toast */}
          {successMessage && (
            <View style={styles.successToast}>
              <CheckCircle2 size={22} color={colors.status.vacant} />
              <View style={{ flex: 1 }}>
                <Text style={styles.toastTitle}>Thành công</Text>
                <Text style={styles.toastDesc}>{successMessage}</Text>
              </View>
            </View>
          )}

          {/* Error Toast */}
          {errorMessage && (
            <View style={styles.errorToast}>
              <AlertCircle size={22} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorToastTitle}>Thông báo</Text>
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
            <View style={[styles.progressFill, { width: '16%' }]} />
            <View style={styles.nodesRow}>
              <View style={[styles.nodeCircle, styles.nodeActive]}>
                <Text style={[styles.nodeText, styles.nodeTextActive]}>1</Text>
              </View>
              <View style={[styles.nodeCircle, styles.nodeInactive]}>
                <Text style={styles.nodeText}>2</Text>
              </View>
              <View style={[styles.nodeCircle, styles.nodeInactive]}>
                <Text style={styles.nodeText}>3</Text>
              </View>
            </View>
          </View>

          {/* 3. Step 1 Card: Phone Input */}
          <View style={styles.stepCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Smartphone size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Xác minh số điện thoại</Text>
                  <Text style={styles.cardSub}>Nhận mã OTP qua SMS</Text>
                </View>
              </View>
              <View style={styles.statusBadgeActive}>
                <Text style={styles.statusBadgeTextActive}>Bước hiện tại</Text>
              </View>
            </View>

            <Text style={styles.cardDesc}>
              Hệ thống sẽ gửi mã số xác nhận gồm 6 chữ số đến số điện thoại này để đảm bảo an toàn cho tài khoản.
            </Text>

            <FormInput
              label="Số điện thoại đăng ký"
              placeholder="Nhập số điện thoại (ví dụ: 0912 345 678)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={
                <View style={styles.phonePrefix}>
                  <Text style={styles.prefixText}>+84</Text>
                  <View style={styles.prefixDivider} />
                </View>
              }
              rightElement={
                phone ? (
                  <TouchableOpacity
                    onPress={() => setPhone('')}
                    style={styles.clearButton}
                    accessibilityLabel="Xóa số điện thoại"
                    accessibilityRole="button"
                  >
                    <X size={16} color={colors.outline} />
                  </TouchableOpacity>
                ) : null
              }
              containerStyle={{ marginBottom: tokens.spacing.md }}
            />

            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                forgotPasswordMutation.isPending && styles.primaryActionButtonDisabled,
              ]}
              onPress={handleSendOtp}
              disabled={forgotPasswordMutation.isPending}
              activeOpacity={0.85}
              accessibilityLabel="Gửi mã OTP"
              accessibilityRole="button"
            >
              {forgotPasswordMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryActionText}>Gửi mã xác thực OTP</Text>
                  <Send size={18} color={colors.onPrimary} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.backToLoginRow}
            onPress={() => router.push('/login')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color={colors.primary} />
            <Text style={styles.backToLoginText}>Bạn nhớ mật khẩu? Đăng nhập ngay</Text>
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
    backgroundColor: 'rgba(92, 225, 230, 0.12)',
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
  cardDesc: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: tokens.spacing.base,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  prefixText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onSurface,
  },
  prefixDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: 8,
  },
  clearButton: {
    padding: 6,
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
  toastTitle: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.status.vacant,
  },
  toastDesc: {
    ...tokens.typography.caption,
    color: colors.onSurface,
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
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.spacing.sm,
  },
  backToLoginText: {
    ...tokens.typography.bodySmMedium,
    color: colors.primary,
  },
});
