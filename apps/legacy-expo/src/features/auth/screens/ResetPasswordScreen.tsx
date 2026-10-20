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
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { HeaderBar } from '../components/HeaderBar';
import { FormInput } from '../components/FormInput';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { useResetPasswordMutation } from '../api/authApi';

export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; token?: string }>();
  const token = params.token || '';

  const resetPasswordMutation = useResetPasswordMutation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { criteria, score } = usePasswordStrength(newPassword);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setErrorMessage(null);
    try {
      await resetPasswordMutation.mutateAsync({
        token,
        newPassword,
      });

      setShowSuccessToast(true);
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại. Vui lòng thử lại!';
      setErrorMessage(msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <HeaderBar title="Tạo mật khẩu mới" onBack={() => router.back()} />

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
            <Text style={styles.screenTitle}>Đặt lại mật khẩu</Text>
            <View style={styles.stepBadge}>
              <View style={styles.stepPulseDot} />
              <Text style={styles.stepBadgeText}>Bước 3 / 3</Text>
            </View>
          </View>
          <Text style={styles.screenSubtitle}>
            Tạo mật khẩu mới an toàn gồm chữ hoa, chữ thường và ký tự đặc biệt để bảo vệ tài khoản của bạn.
          </Text>

          {/* Success Toast */}
          {showSuccessToast && (
            <View style={styles.successToast}>
              <CheckCircle2 size={24} color={colors.status.vacant} />
              <View style={{ flex: 1 }}>
                <Text style={styles.toastTitle}>Đặt lại mật khẩu thành công!</Text>
                <Text style={styles.toastDesc}>Đang tự động chuyển hướng về màn hình đăng nhập...</Text>
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
            <View style={[styles.progressFill, { width: '100%' }]} />
            <View style={styles.nodesRow}>
              <View style={[styles.nodeCircle, styles.nodeActive]}>
                <Text style={[styles.nodeText, styles.nodeTextActive]}>1</Text>
              </View>
              <View style={[styles.nodeCircle, styles.nodeActive]}>
                <Text style={[styles.nodeText, styles.nodeTextActive]}>2</Text>
              </View>
              <View style={[styles.nodeCircle, styles.nodeActive]}>
                <Text style={[styles.nodeText, styles.nodeTextActive]}>3</Text>
              </View>
            </View>
          </View>

          {/* 3. Step 3 Card: Password Form */}
          <View style={styles.stepCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Lock size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Mật khẩu bảo mật</Text>
                  <Text style={styles.cardSub}>Nhập mật khẩu mới</Text>
                </View>
              </View>
              <View style={styles.statusBadgeActive}>
                <Text style={styles.statusBadgeTextActive}>Bước cuối</Text>
              </View>
            </View>

            <FormInput
              label="Mật khẩu mới"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPass}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowNewPass((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel="Hiện mật khẩu"
                  accessibilityRole="button"
                >
                  {showNewPass ? (
                    <EyeOff size={18} color={colors.outline} />
                  ) : (
                    <Eye size={18} color={colors.outline} />
                  )}
                </TouchableOpacity>
              }
              containerStyle={{ marginBottom: tokens.spacing.xs }}
            />

            <FormInput
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPass}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowConfirmPass((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel="Hiện mật khẩu xác nhận"
                  accessibilityRole="button"
                >
                  {showConfirmPass ? (
                    <EyeOff size={18} color={colors.outline} />
                  ) : (
                    <Eye size={18} color={colors.outline} />
                  )}
                </TouchableOpacity>
              }
              containerStyle={{ marginBottom: tokens.spacing.sm }}
            />

            {/* Password strength meter */}
            {newPassword ? (
              <PasswordStrengthMeter criteria={criteria} score={score} />
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                (resetPasswordMutation.isPending || !newPassword || !confirmPassword) &&
                  styles.primaryActionButtonDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={resetPasswordMutation.isPending || !newPassword || !confirmPassword}
              activeOpacity={0.85}
              accessibilityLabel="Cập nhật mật khẩu"
              accessibilityRole="button"
            >
              {resetPasswordMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <KeyRound size={18} color={colors.onPrimary} />
                  <Text style={styles.primaryActionText}>Cập nhật mật khẩu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    marginBottom: tokens.spacing.base,
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
  eyeButton: {
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
    marginTop: tokens.spacing.md,
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
});
