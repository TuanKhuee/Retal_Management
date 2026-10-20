import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Mail,
  Moon,
  Clock,
  Calendar,
  Phone,
  CheckCircle2,
  MapPin,
  DoorOpen,
  Zap,
  Droplets,
  Wifi,
  User,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Check,
  Key,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { HeaderBar } from '../components/HeaderBar';
import { FormInput } from '../components/FormInput';
import { formatMoney } from '../../../utils/format';
import { useInvitationQuery, useAcceptInviteMutation } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';

export function SetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setRole = useAuthStore((s) => s.setRole);
  const { data: invitationData } = useInvitationQuery('inv-tok-999');
  const acceptInviteMutation = useAcceptInviteMutation();

  const [tenantName, setTenantName] = useState('Trần Thị Minh Thư');
  const [phoneNumber] = useState('0908 776 543');
  const [password, setPassword] = useState('MinhThu@2025');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeRules, setAgreeRules] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const landlordInfo = (invitationData as { landlord?: { fullName?: string; propertyName?: string; address?: string; phone?: string } })?.landlord;
  const roomInfo = (invitationData as { room?: { code?: string; feature?: string; rent?: number; deposit?: number } })?.room;

  const handleCallLandlord = () => {
    const phoneToCall = landlordInfo?.phone || '0903123456';
    Linking.openURL(`tel:${phoneToCall}`).catch(() => {});
  };

  const handleAccept = async () => {
    if (!password || password.length < 6) {
      setErrorMessage('Mật khẩu kích hoạt phải có tối thiểu 6 ký tự.');
      return;
    }
    if (!agreeRules) {
      setErrorMessage('Vui lòng đồng ý với Nội quy phòng trọ.');
      return;
    }

    setErrorMessage(null);
    try {
      await acceptInviteMutation.mutateAsync({
        token: 'inv-tok-999',
        password,
        fullName: tenantName.trim(),
      });
      setRole('TENANT');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kích hoạt nhận phòng thất bại. Vui lòng thử lại!';
      setErrorMessage(msg);
    }
  };

  const handleDecline = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <HeaderBar title={t('setPass.title')} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Ambient Greeting & Icon Badge */}
          <View style={styles.greetingHeader}>
            <View style={styles.cottageIconWrapper}>
              <Home size={30} color={colors.primary} />
              <View style={styles.mailBadge}>
                <Mail size={12} color={colors.onSecondaryContainer} />
              </View>
            </View>

            <View style={styles.inviteTag}>
              <Moon size={14} color={colors.secondary} />
              <Text style={styles.inviteTagText}>
                {t('setPass.invitationTag')}
              </Text>
            </View>

            <Text style={styles.welcomeTitle}>
              {t('setPass.welcomeNewHome')}
            </Text>
            <Text style={styles.welcomeDesc}>
              {t('setPass.welcomeDesc')}
            </Text>
          </View>

          {/* 2. Main Invitation Details Card */}
          <View style={styles.mainCard}>
            {/* Top Status & Date Banner */}
            <View style={styles.bannerRow}>
              <View style={styles.waitingChip}>
                <Clock size={14} color={colors.secondary} />
                <Text style={styles.waitingChipText}>
                  {t('setPass.waitingCustomer')}
                </Text>
              </View>

              <View style={styles.dateGroup}>
                <Calendar size={13} color={colors.onSurfaceVariant} />
                <Text style={styles.dateText}>{t('setPass.startDate')}</Text>
              </View>
            </View>

            {/* Landlord Quick Profile */}
            <View style={styles.landlordRow}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXtAXRDeJDEtFXxeZ-42jO0yrxSWDCxbbXgjWVRnEjqVIFpOv8VSDgFnihm5Tfg_Q2Ieg9rRkMA242IZ-P__KWyn5AC3UFT6ePmjVf9l76c77H4w8A--JyT_1p3wXopMkdcKVxjsOxijBqWuB3gvqTZKOFO_Oq-OxKJkvRHSVtYUi4RPR8Z_MoZONpAYpJXTFu0mH7rwpR84XpE-zkUyW7iCrk9DhQFlhP92l31uw',
                }}
                defaultSource={require('../../../../assets/images/icon.png')}
                style={styles.landlordAvatar}
              />

              <View style={styles.landlordInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.landlordName}>{landlordInfo?.fullName || 'Nguyễn Văn Hùng'}</Text>
                  <CheckCircle2 size={15} color={colors.primary} />
                </View>
                <Text style={styles.propertyName}>{landlordInfo?.propertyName || 'Nhà trọ MoonLight Riverside'}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={12} color={colors.primary} />
                  <Text style={styles.locationText}>{landlordInfo?.address || 'Quận 7, TP. Hồ Chí Minh'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallLandlord}
                activeOpacity={0.8}
                accessibilityLabel="Gọi chủ nhà"
                accessibilityRole="button"
              >
                <Phone size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Room Specifics Bento */}
            <View style={styles.roomBox}>
              <View style={styles.roomHeaderRow}>
                <View style={styles.roomTitleGroup}>
                  <View style={styles.roomIconSquare}>
                    <DoorOpen size={18} color={colors.onPrimaryFixed} />
                  </View>
                  <View>
                    <Text style={styles.roomCode}>{roomInfo?.code || t('setPass.room302')}</Text>
                    <Text style={styles.roomSub}>{roomInfo?.feature || t('setPass.roomFeature')}</Text>
                  </View>
                </View>
                <View style={styles.roomFeatureBadge}>
                  <Text style={styles.roomFeatureText}>
                    {t('setPass.selfContained')}
                  </Text>
                </View>
              </View>

              {/* Price & Deposit 2 cols */}
              <View style={styles.priceRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>{t('setPass.rentPrice')}</Text>
                  <View style={styles.amountLine}>
                    <Text style={[styles.amountValue, { color: colors.primary }]}>
                      {formatMoney(roomInfo?.rent || 4200000)}
                    </Text>
                    <Text style={styles.amountUnit}>{t('setPass.perMonth')}</Text>
                  </View>
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>{t('setPass.deposit')}</Text>
                  <View style={styles.amountLine}>
                    <Text style={styles.amountValue}>{formatMoney(roomInfo?.deposit || 4200000)}</Text>
                    <Text style={styles.depositNote}>{t('setPass.oneMonth')}</Text>
                  </View>
                </View>
              </View>

              {/* Utilities Inclusion Pills */}
              <View style={styles.utilitiesRow}>
                <View style={styles.utilityPill}>
                  <Zap size={13} color={colors.primary} />
                  <Text style={styles.utilityText}>{t('setPass.electric')}</Text>
                </View>
                <View style={styles.utilityPill}>
                  <Droplets size={13} color={colors.primary} />
                  <Text style={styles.utilityText}>{t('setPass.water')}</Text>
                </View>
                <View style={styles.utilityPill}>
                  <Wifi size={13} color={colors.secondary} />
                  <Text style={styles.utilityText}>{t('setPass.wifiTrash')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Account Setup Section */}
          <View style={styles.setupCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.sectionTitleText}>
                {t('setPass.step2Title')}
              </Text>
            </View>

            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <AlertCircle size={20} color={colors.error} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorBannerTitle}>Thông báo</Text>
                  <Text style={styles.errorBannerDesc}>{errorMessage}</Text>
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

            {/* Tenant Name */}
            <FormInput
              label={t('setPass.tenantName')}
              labelRight={
                <Text style={styles.dimNote}>{t('setPass.asHandedOver')}</Text>
              }
              value={tenantName}
              onChangeText={setTenantName}
              leftIcon={<User size={18} color={colors.tertiary} />}
            />

            {/* Locked Phone */}
            <FormInput
              label={t('setPass.phoneActivation')}
              labelRight={
                <View style={styles.lockNotice}>
                  <Lock size={12} color={colors.primary} />
                  <Text style={styles.lockNoticeText}>
                    {t('setPass.lockedByInvite')}
                  </Text>
                </View>
              }
              value={phoneNumber}
              isLocked={true}
              leftIcon={<Smartphone size={18} color={colors.outline} />}
              rightElement={
                <CheckCircle2 size={18} color={colors.status.vacant} style={{ marginRight: 12 }} />
              }
              helperText={t('setPass.phoneUseNote')}
            />

            {/* Password */}
            <FormInput
              label={t('setPass.createPersonalPass')}
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={18} color={colors.tertiary} />}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel="Hiện mật khẩu"
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

            {/* Agreement Checkbox */}
            <TouchableOpacity
              style={styles.agreementRow}
              onPress={() => setAgreeRules((prev) => !prev)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreeRules }}
            >
              <View style={[styles.checkbox, agreeRules && styles.checkboxChecked]}>
                {agreeRules && <Check size={12} color={colors.onPrimary} />}
              </View>
              <Text style={styles.agreementText}>{t('setPass.confirmRule')}</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              disabled={acceptInviteMutation.isPending}
              activeOpacity={0.85}
              accessibilityLabel="Chấp nhận lời mời & Nhận phòng"
              accessibilityRole="button"
            >
              {acceptInviteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <Key size={18} color={colors.onPrimary} />
                  <Text style={styles.acceptButtonText}>
                    {t('setPass.acceptInvite')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.7}
              accessibilityLabel="Từ chối lời mời này"
              accessibilityRole="button"
            >
              <X size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.declineButtonText}>
                {t('setPass.declineInvite')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4. Security Guarantee Footer */}
          <View style={styles.securityFooter}>
            <ShieldCheck size={16} color={colors.primary} />
            <Text style={styles.securityFooterText}>
              {t('setPass.securityGuaranteed')}
            </Text>
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
    gap: tokens.spacing.md,
  },
  greetingHeader: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs,
  },
  cottageIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: tokens.radii.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  mailBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 223, 159, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
    marginBottom: 6,
  },
  inviteTagText: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.onSecondaryFixedVariant,
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    ...tokens.typography.titleMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  welcomeDesc: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 320,
    lineHeight: 20,
  },
  mainCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    ...tokens.shadows.sm,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    marginHorizontal: -tokens.spacing.lg,
    marginTop: -tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderTopLeftRadius: tokens.radii.lg,
    borderTopRightRadius: tokens.radii.lg,
    marginBottom: tokens.spacing.md,
  },
  waitingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
  },
  waitingChipText: {
    ...tokens.typography.caption,
    color: colors.onSecondaryFixedVariant,
    fontWeight: '600',
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  landlordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 243, 255, 0.5)',
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
    gap: 12,
  },
  landlordAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
  },
  landlordInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  landlordName: {
    ...tokens.typography.bodySmMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  propertyName: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  locationText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontSize: 11,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBox: {
    gap: tokens.spacing.sm,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.md,
  },
  roomTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomIconSquare: {
    width: 36,
    height: 36,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCode: {
    ...tokens.typography.titleSm,
    color: colors.onSurface,
  },
  roomSub: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  roomFeatureBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radii.full,
  },
  roomFeatureText: {
    ...tokens.typography.caption,
    color: colors.tertiary,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.md,
  },
  priceLabel: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  amountLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  amountValue: {
    ...tokens.typography.tabularAmount,
    color: colors.onSurface,
    fontWeight: '700',
  },
  amountUnit: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  depositNote: {
    ...tokens.typography.caption,
    color: colors.onSecondaryFixedVariant,
  },
  utilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  utilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
  },
  utilityText: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  setupCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    ...tokens.shadows.sm,
    gap: tokens.spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: tokens.spacing.sm,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...tokens.typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  sectionTitleText: {
    ...tokens.typography.bodyBaseMedium,
    color: colors.onSurface,
  },
  dimNote: {
    ...tokens.typography.caption,
    color: colors.tertiary,
    fontSize: 11,
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lockNoticeText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontSize: 11,
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: tokens.spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
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
  agreementText: {
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
    alignItems: 'center',
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
  },
  acceptButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  acceptButtonText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  declineButton: {
    width: '100%',
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  declineButtonText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onSurfaceVariant,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.spacing.sm,
  },
  securityFooterText: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
});
