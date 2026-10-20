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
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Zap,
  Check,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { HeaderBar } from '../components/HeaderBar';
import { FormInput } from '../components/FormInput';
import { StepperInput } from '../components/StepperInput';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { useRegisterMutation } from '../api/authApi';

interface FormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  propertyName?: string;
  agreeTerms?: string;
}

export function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const registerMutation = useRegisterMutation();

  // 1. Initial State: Empty fields (no autofill / pre-filled demo data)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [propertyName, setPropertyName] = useState('');
  const [roomCount, setRoomCount] = useState(10);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { score, label: strengthLabel } = usePasswordStrength(password);

  // 2. Field-level validation rules
  const validateField = (field: keyof FormErrors, value: string | boolean): string | undefined => {
    switch (field) {
      case 'fullName': {
        const str = (value as string).trim();
        if (!str) return 'Vui lòng nhập họ và tên chủ nhà.';
        if (str.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
        return undefined;
      }
      case 'phone': {
        const str = (value as string).replace(/\s+/g, '');
        if (!str) return 'Vui lòng nhập số điện thoại.';
        const phoneRegex = /^(0[35789])[0-9]{8}$/;
        if (!phoneRegex.test(str)) {
          return 'Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09).';
        }
        return undefined;
      }
      case 'email': {
        const str = (value as string).trim();
        if (!str) return 'Vui lòng nhập địa chỉ email.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(str)) {
          return 'Email không đúng định dạng (ví dụ: name@gmail.com).';
        }
        return undefined;
      }
      case 'password': {
        const str = value as string;
        if (!str) return 'Vui lòng nhập mật khẩu.';
        if (str.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
        if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(str)) {
          return 'Mật khẩu cần bao gồm cả chữ cái và số.';
        }
        return undefined;
      }
      case 'propertyName': {
        const str = (value as string).trim();
        if (!str) return 'Vui lòng nhập tên nhà trọ / khu trọ.';
        if (str.length < 3) return 'Tên nhà trọ phải có ít nhất 3 ký tự.';
        return undefined;
      }
      case 'agreeTerms': {
        if (!value) return 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.';
        return undefined;
      }
      default:
        return undefined;
    }
  };

  const validateAll = (): FormErrors => {
    return {
      fullName: validateField('fullName', fullName),
      phone: validateField('phone', phone),
      email: validateField('email', email),
      password: validateField('password', password),
      propertyName: validateField('propertyName', propertyName),
      agreeTerms: validateField('agreeTerms', agreeTerms),
    };
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val =
      field === 'agreeTerms'
        ? agreeTerms
        : field === 'fullName'
        ? fullName
        : field === 'phone'
        ? phone
        : field === 'email'
        ? email
        : field === 'password'
        ? password
        : propertyName;
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChangeText = (field: keyof FormErrors, value: string) => {
    switch (field) {
      case 'fullName':
        setFullName(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'propertyName':
        setPropertyName(value);
        break;
    }

    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleToggleTerms = () => {
    const nextVal = !agreeTerms;
    setAgreeTerms(nextVal);
    setTouched((prev) => ({ ...prev, agreeTerms: true }));
    const err = validateField('agreeTerms', nextVal);
    setErrors((prev) => ({ ...prev, agreeTerms: err }));
  };

  const handleRegister = async () => {
    setTouched({
      fullName: true,
      phone: true,
      email: true,
      password: true,
      propertyName: true,
      agreeTerms: true,
    });

    const currentErrors = validateAll();
    setErrors(currentErrors);

    const hasErrors = Object.values(currentErrors).some(Boolean);
    if (hasErrors) {
      setErrorMessage('Vui lòng kiểm tra và hoàn thành chính xác các thông tin bắt buộc.');
      return;
    }

    setErrorMessage(null);
    const cleanPhone = phone.replace(/\s+/g, '');

    try {
      await registerMutation.mutateAsync({
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim(),
        password,
        organizationName: propertyName.trim(),
      });
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Đăng ký tài khoản thất bại. Vui lòng thử lại!';
      setErrorMessage(msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <HeaderBar title={t('register.title')} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Warm Greeting Card */}
          <View style={styles.greetingCard}>
            <View style={styles.convenientPill}>
              <Moon size={14} color={colors.secondary} fill={colors.secondary} />
              <Text style={styles.convenientText}>
                {t('register.convenientStart')}
              </Text>
            </View>

            <Text style={styles.greetingTitle}>
              {t('register.freeManagement')}
            </Text>
            <Text style={styles.greetingDesc}>
              {t('register.freeManagementDesc')}
            </Text>

            <Building2
              size={54}
              color={colors.primary}
              style={styles.buildingWatermark}
            />
          </View>

          {/* 2. Registration Form Fields */}
          <View style={styles.formContainer}>
            {/* Dynamic Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <AlertCircle size={20} color={colors.error} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorBannerTitle}>{t('auth.errorTitle')}</Text>
                  <Text style={styles.errorBannerDesc}>{errorMessage}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setErrorMessage(null)}
                  style={styles.closeErrorButton}
                  accessibilityLabel="Đóng thông báo lỗi"
                  accessibilityRole="button"
                >
                  <X size={16} color={colors.onErrorContainer} />
                </TouchableOpacity>
              </View>
            )}

            {/* Full Name */}
            <FormInput
              label={t('register.fullName')}
              labelRight={
                <Text style={styles.requiredTag}>{t('register.required')}</Text>
              }
              placeholder={t('register.fullNamePlaceholder')}
              value={fullName}
              onChangeText={(val) => handleChangeText('fullName', val)}
              onBlur={() => handleBlur('fullName')}
              errorText={touched.fullName ? errors.fullName : undefined}
              leftIcon={<User size={18} color={colors.outline} />}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCorrect={false}
              spellCheck={false}
            />

            {/* Phone (Bỏ +84, icon Phone chuẩn, validation 10 số VN) */}
            <FormInput
              label={t('register.phone')}
              labelRight={
                <Text style={styles.otpTag}>{t('register.receiveOtp')}</Text>
              }
              placeholder={t('register.phonePlaceholder')}
              value={phone}
              onChangeText={(val) => handleChangeText('phone', val)}
              onBlur={() => handleBlur('phone')}
              errorText={touched.phone ? errors.phone : undefined}
              keyboardType="phone-pad"
              leftIcon={<Phone size={18} color={colors.outline} />}
              helperText={!errors.phone ? t('register.phoneNote') : undefined}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCorrect={false}
              spellCheck={false}
            />

            {/* Email */}
            <FormInput
              label={t('register.email')}
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChangeText={(val) => handleChangeText('email', val)}
              onBlur={() => handleBlur('email')}
              errorText={touched.email ? errors.email : undefined}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={18} color={colors.outline} />}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCorrect={false}
              spellCheck={false}
            />

            {/* Password */}
            <View style={{ marginBottom: tokens.spacing.xs }}>
              <FormInput
                label={t('register.password')}
                labelRight={
                  <Text style={styles.strengthTag}>
                    {password ? strengthLabel : t('register.minChars')}
                  </Text>
                }
                placeholder="••••••••"
                value={password}
                onChangeText={(val) => handleChangeText('password', val)}
                onBlur={() => handleBlur('password')}
                errorText={touched.password ? errors.password : undefined}
                secureTextEntry={!showPassword}
                leftIcon={<Lock size={18} color={colors.outline} />}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                autoCorrect={false}
                spellCheck={false}
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
                containerStyle={{ marginBottom: 4 }}
              />
              <PasswordStrengthMeter score={score} />
            </View>

            {/* Initial Property Setup Box */}
            <View style={styles.propertySetupBox}>
              <View style={styles.propertySetupHeader}>
                <Building2 size={18} color={colors.primary} />
                <Text style={styles.propertySetupTitle}>
                  {t('register.initialSetup')}
                </Text>
              </View>

              <FormInput
                label={t('register.propertyName')}
                placeholder={t('register.propertyNamePlaceholder')}
                value={propertyName}
                onChangeText={(val) => handleChangeText('propertyName', val)}
                onBlur={() => handleBlur('propertyName')}
                errorText={touched.propertyName ? errors.propertyName : undefined}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                autoCorrect={false}
                spellCheck={false}
                containerStyle={{ marginBottom: tokens.spacing.sm }}
              />

              <View style={styles.stepperRow}>
                <View>
                  <Text style={styles.stepperLabel}>
                    {t('register.initialScale')}
                  </Text>
                  <Text style={styles.stepperSub}>
                    {t('register.scaleNote')}
                  </Text>
                </View>
                <StepperInput
                  value={roomCount}
                  onChange={setRoomCount}
                  unit={t('register.roomsUnit')}
                />
              </View>
            </View>

            {/* Terms and Policy Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={handleToggleTerms}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreeTerms }}
            >
              <View
                style={[
                  styles.checkbox,
                  agreeTerms && styles.checkboxChecked,
                  touched.agreeTerms && errors.agreeTerms ? styles.checkboxError : null,
                ]}
              >
                {agreeTerms && <Check size={12} color={colors.onPrimary} />}
              </View>
              <Text style={styles.termsText}>
                {t('register.agreeTerms')}
              </Text>
            </TouchableOpacity>
            {touched.agreeTerms && errors.agreeTerms ? (
              <Text style={styles.termsErrorText}>{errors.agreeTerms}</Text>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
              activeOpacity={0.85}
              accessibilityLabel={t('register.submit')}
              accessibilityRole="button"
            >
              {registerMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <UserCheck size={20} color={colors.onPrimary} />
                  <Text style={styles.submitButtonText}>{t('register.submit')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Trust Badges */}
            <View style={styles.trustRow}>
              <View style={styles.trustCard}>
                <ShieldCheck size={22} color={colors.secondary} />
                <View>
                  <Text style={styles.trustTitle}>
                    {t('register.badgeMultiLayerSecurity')}
                  </Text>
                  <Text style={styles.trustSub}>
                    {t('register.badgeMultiLayerSecuritySub')}
                  </Text>
                </View>
              </View>

              <View style={styles.trustCard}>
                <Zap size={22} color={colors.secondary} />
                <View>
                  <Text style={styles.trustTitle}>
                    {t('register.badgeAutomation')}
                  </Text>
                  <Text style={styles.trustSub}>
                    {t('register.badgeAutomationSub')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer Sign-in Link */}
            <View style={styles.footerContainer}>
              <View style={styles.signInRow}>
                <Text style={styles.signInLabel}>{t('register.hasAccount')} </Text>
                <TouchableOpacity
                  onPress={() => router.push('/login')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Đăng nhập ngay"
                >
                  <Text style={styles.signInLinkText}>{t('intro.loginNow')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hotlineText}>
                {t('register.supportHotline')}
              </Text>
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
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing['2xl'],
  },
  greetingCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.sm,
  },
  convenientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
    backgroundColor: colors.secondaryFixed,
    alignSelf: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  convenientText: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.onSecondaryFixed,
  },
  greetingTitle: {
    ...tokens.typography.titleSm,
    color: colors.onSurface,
    marginBottom: 4,
  },
  greetingDesc: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    maxWidth: '85%',
  },
  buildingWatermark: {
    position: 'absolute',
    right: 12,
    top: 12,
    opacity: 0.15,
  },
  formContainer: {
    gap: tokens.spacing.xs,
  },
  requiredTag: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
  otpTag: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
  strengthTag: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
  eyeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertySetupBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    marginVertical: tokens.spacing.xs,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  propertySetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propertySetupTitle: {
    ...tokens.typography.bodySmMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  stepperLabel: {
    ...tokens.typography.bodySmMedium,
    color: colors.onSurface,
  },
  stepperSub: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: tokens.spacing.sm,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxError: {
    borderColor: colors.error,
  },
  termsErrorText: {
    ...tokens.typography.caption,
    color: colors.error,
    marginBottom: tokens.spacing.sm,
    paddingLeft: 30,
  },
  termsText: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: colors.errorContainer,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: tokens.spacing.sm,
  },
  errorBannerTitle: {
    ...tokens.typography.bodySmMedium,
    color: colors.onErrorContainer,
    fontWeight: '700',
  },
  errorBannerDesc: {
    ...tokens.typography.caption,
    color: colors.onErrorContainer,
    marginTop: 2,
    lineHeight: 18,
  },
  closeErrorButton: {
    padding: 4,
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  submitButtonText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  trustRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  trustCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...tokens.shadows.sm,
  },
  trustTitle: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.onSurface,
  },
  trustSub: {
    ...tokens.typography.caption,
    color: colors.outline,
    fontSize: 10,
  },
  footerContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: tokens.spacing.lg,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInLabel: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  signInLinkText: {
    ...tokens.typography.bodySmMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  hotlineText: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
});
