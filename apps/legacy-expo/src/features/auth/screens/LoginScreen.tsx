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
import { useTranslation } from 'react-i18next';
import {
  Moon,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Check,
  Fingerprint,
  ScanFace,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { FormInput } from '../components/FormInput';
import { useLoginMutation } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';

export function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setStoreRole = useAuthStore((s) => s.setRole);
  const loginMutation = useLoginMutation();

  const [role, setRole] = useState<'OWNER' | 'TENANT'>('OWNER');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const handleSelectRole = (newRole: 'OWNER' | 'TENANT') => {
    setRole(newRole);
    setStoreRole(newRole);
  };

  const handleSubmit = async () => {
    const trimmedId = identifier.replace(/\s+/g, '');
    if (!trimmedId || !password) {
      setShowErrorBanner(true);
      setCustomError('Vui lòng nhập đầy đủ thông tin đăng nhập.');
      return;
    }

    setShowErrorBanner(false);
    try {
      const res = await loginMutation.mutateAsync({
        identifier: trimmedId,
        password,
      });
      const resolvedRole = res?.user?.role || role;
      setStoreRole(resolvedRole);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setShowErrorBanner(true);
      const msg = err instanceof Error ? err.message : t('auth.errorDesc');
      setCustomError(msg);
    }
  };

  const handleBiometricLogin = () => {
    setStoreRole(role);
    router.replace('/dashboard');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header & App Emblem */}
          <View style={styles.header}>
            <View style={styles.emblemWrapper}>
              <View style={styles.emblemInner}>
                <View style={styles.star1} />
                <View style={styles.star2} />
                <Moon size={32} color={colors.secondaryContainer} fill={colors.secondaryContainer} />
              </View>
            </View>

            <Text style={styles.title}>{t('auth.loginTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

            {/* Role Switcher Pill */}
            <View style={styles.roleSwitcher}>
              <TouchableOpacity
                style={[styles.roleTab, role === 'OWNER' && styles.roleTabActive]}
                onPress={() => handleSelectRole('OWNER')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Chủ trọ / Quản lý"
              >
                <Text
                  style={[
                    styles.roleTabText,
                    role === 'OWNER' && styles.roleTabTextActive,
                  ]}
                >
                  {t('auth.roleOwner')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleTab, role === 'TENANT' && styles.roleTabActive]}
                onPress={() => handleSelectRole('TENANT')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Khách thuê phòng"
              >
                <Text
                  style={[
                    styles.roleTabText,
                    role === 'TENANT' && styles.roleTabTextActive,
                  ]}
                >
                  {t('auth.roleTenant')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Main Card Surface */}
          <View style={styles.card}>
            {/* Dynamic Error Banner */}
            {showErrorBanner && (
              <View style={styles.errorBanner}>
                <AlertCircle size={20} color={colors.error} style={styles.errorIcon} />
                <View style={styles.errorTextGroup}>
                  <Text style={styles.errorBannerTitle}>{t('auth.errorTitle')}</Text>
                  <Text style={styles.errorBannerDesc}>
                    {customError || t('auth.errorDesc')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowErrorBanner(false)}
                  style={styles.closeErrorButton}
                  accessibilityLabel="Đóng thông báo lỗi"
                  accessibilityRole="button"
                >
                  <X size={16} color={colors.onErrorContainer} />
                </TouchableOpacity>
              </View>
            )}

            {/* Input 1: Identifier */}
            <FormInput
              label={t('auth.identity')}
              placeholder={t('auth.identityPlaceholder')}
              value={identifier}
              onChangeText={setIdentifier}
              leftIcon={<User size={18} color={colors.outline} />}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Input 2: Password */}
            <FormInput
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={18} color={colors.outline} />}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  accessibilityRole="button"
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.outline} />
                  ) : (
                    <Eye size={18} color={colors.outline} />
                  )}
                </TouchableOpacity>
              }
            />

            {/* Auxiliary Row */}
            <View style={styles.auxRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe((prev) => !prev)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Check size={12} color={colors.onPrimary} />}
                </View>
                <Text style={styles.rememberMeText}>{t('auth.rememberMe')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/otp-verification')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Quên mật khẩu"
              >
                <Text style={styles.forgotPasswordText}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loginMutation.isPending}
              activeOpacity={0.85}
              accessibilityLabel="Đăng nhập"
              accessibilityRole="button"
            >
              {loginMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>{t('auth.loginButton')}</Text>
              )}
            </TouchableOpacity>

            {/* Biometric Login */}
            <View style={styles.biometricSection}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orQuickWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                activeOpacity={0.8}
                accessibilityLabel="Đăng nhập bằng Face ID hoặc Vân tay"
                accessibilityRole="button"
              >
                <Fingerprint size={20} color={colors.primary} />
                <ScanFace size={20} color={colors.primary} />
                <Text style={styles.biometricText}>{t('auth.biometric')}</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: tokens.spacing.base,
    paddingBottom: tokens.spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  emblemWrapper: {
    width: 64,
    height: 64,
    borderRadius: tokens.radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
    ...tokens.shadows.md,
  },
  emblemInner: {
    width: '100%',
    height: '100%',
    borderRadius: tokens.radii.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  star1: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondaryFixed,
  },
  star2: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
    opacity: 0.7,
  },
  title: {
    ...tokens.typography.titleMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: tokens.radii.full,
    padding: 4,
    marginTop: tokens.spacing.base,
  },
  roleTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: tokens.radii.full,
  },
  roleTabActive: {
    backgroundColor: colors.surfaceContainerLowest,
    ...tokens.shadows.sm,
  },
  roleTabText: {
    ...tokens.typography.caption,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  roleTabTextActive: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    ...tokens.shadows.sm,
  },
  errorBanner: {
    backgroundColor: colors.errorContainer,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: tokens.spacing.md,
  },
  errorIcon: {
    marginTop: 2,
  },
  errorTextGroup: {
    flex: 1,
  },
  errorBannerTitle: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.error,
  },
  errorBannerDesc: {
    ...tokens.typography.caption,
    color: colors.onErrorContainer,
    marginTop: 2,
    opacity: 0.9,
  },
  closeErrorButton: {
    padding: 2,
  },
  eyeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: tokens.spacing.xs,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberMeText: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  forgotPasswordText: {
    ...tokens.typography.bodySmMedium,
    color: colors.primary,
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  submitButtonText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  biometricSection: {
    marginTop: tokens.spacing.base,
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  dividerText: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
  biometricButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  biometricText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onSurface,
  },
});
