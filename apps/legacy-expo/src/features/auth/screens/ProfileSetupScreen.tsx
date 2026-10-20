import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Moon,
  ShieldCheck,
  Building2,
  Key,
  TrendingUp,
  Receipt,
  QrCode,
  Wrench,
  RotateCw,
  ArrowRight,
  Grid,
  DoorOpen,
  FileText,
  Zap,
  Settings,
  Home,
  MessageSquare,
  User,
  GitFork,
  CheckCircle2,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { HeaderBar } from '../components/HeaderBar';
import { formatMoney } from '../../../utils/format';
import { useAuthStore } from '../../../store/authStore';
import {
  useProfileQuery,
  useLandlordDashboardQuery,
  useTenantWorkspaceQuery,
} from '../api/authApi';

interface DashboardData {
  finance?: {
    currentRevenue?: number;
    targetRevenue?: number;
    totalDebt?: number;
  };
  rooms?: {
    occupancyRate?: string;
    occupied?: number;
    total?: number;
  };
  pendingInvoices?: {
    label?: string;
  };
}

interface TenantWorkspaceData {
  roomCode?: string;
  currentBillAmount?: number;
}

export function ProfileSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userRole = useAuthStore((s) => s.role);
  const setStoreRole = useAuthStore((s) => s.setRole);

  const [selectedRole, setSelectedRole] = useState<'landlord' | 'tenant'>(
    userRole === 'TENANT' ? 'tenant' : 'landlord',
  );
  const [countdown, setCountdown] = useState(3);
  const [toastDismissed, setToastDismissed] = useState(false);

  const { data: profile } = useProfileQuery();
  const { data: dashboardRaw } = useLandlordDashboardQuery();
  const { data: tenantWorkspaceRaw } = useTenantWorkspaceQuery();

  const dashboard = dashboardRaw as DashboardData | undefined;
  const tenantWorkspace = tenantWorkspaceRaw as TenantWorkspaceData | undefined;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      router.replace('/dashboard');
    }
  }, [countdown, router]);

  const handleSelectRole = (role: 'landlord' | 'tenant') => {
    setSelectedRole(role);
    setStoreRole(role === 'landlord' ? 'OWNER' : 'TENANT');
    router.replace('/dashboard');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <HeaderBar title={t('profileSetup.title')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Ambient Recognition Banner */}
        <View style={styles.ambientBanner}>
          <View style={styles.bannerGlow} />

          <View style={styles.verifiedChip}>
            <ShieldCheck size={14} color={colors.secondaryContainer} />
            <Text style={styles.verifiedChipText}>
              {t('profileSetup.verifiedTag')}
            </Text>
          </View>

          <View style={styles.bannerContentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {t('profileSetup.smartRouting')}
              </Text>
              <Text style={styles.bannerDesc}>
                {t('profileSetup.smartRoutingDesc')}
              </Text>
            </View>

            <View style={styles.bannerMoonIcon}>
              <Moon size={32} color={colors.secondaryContainer} fill={colors.secondaryContainer} />
            </View>
          </View>

          {/* Countdown & Sync status */}
          <View style={styles.syncRow}>
            <View style={styles.syncLeft}>
              <RotateCw size={14} color={colors.secondaryContainer} />
              <Text style={styles.syncText}>
                {t('profileSetup.syncingData')}
              </Text>
            </View>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownBadgeText}>
                {t('profileSetup.autoRedirectIn')} {countdown}s
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (4 - countdown) * 33.3)}%` },
              ]}
            />
          </View>
        </View>

        {/* 2. Role Selector Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Building2 size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              {t('profileSetup.chooseRole')}
            </Text>
          </View>
          <View style={styles.spacesBadge}>
            <Text style={styles.spacesBadgeText}>
              {t('profileSetup.spacesAvailable')}
            </Text>
          </View>
        </View>

        {/* 3. CARD 1: Landlord Role */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'landlord' && styles.roleCardActive,
          ]}
          onPress={() => setSelectedRole('landlord')}
          activeOpacity={0.9}
        >
          {/* Header */}
          <View style={styles.roleCardHeader}>
            <View style={styles.roleCardHeaderLeft}>
              <View style={styles.roleIconCircleLandlord}>
                <Building2 size={22} color={colors.primary} />
              </View>
              <View>
                <View style={styles.roleTitleGroup}>
                  <Text style={styles.roleTitleText}>
                    {t('profileSetup.landlordRoleTitle')}
                  </Text>
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>
                      {t('profileSetup.adminBadge')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.roleSubText}>
                  {profile?.organizationName || t('profileSetup.landlordRoleSubtitle')}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.radioIndicator,
                selectedRole === 'landlord' && styles.radioIndicatorSelected,
              ]}
            >
              {selectedRole === 'landlord' && (
                <View style={styles.radioDot} />
              )}
            </View>
          </View>

          {/* Mini Preview Snapshot */}
          <View style={styles.snapshotBox}>
            <View style={styles.snapshotTopRow}>
              <Text style={styles.snapshotTopLabel}>
                {t('profileSetup.financialMetric')}
              </Text>
              <View style={styles.trendRow}>
                <TrendingUp size={13} color={colors.primary} />
                <Text style={styles.trendText}>+12% MoM</Text>
              </View>
            </View>

            <View style={styles.snapshotGrid}>
              <View style={styles.metricCell}>
                <Text style={styles.metricCellLabel}>
                  {t('profileSetup.collectedRevenue')}
                </Text>
                <Text style={[styles.metricCellValue, { color: colors.primary }]}>
                  {formatMoney(dashboard?.finance?.currentRevenue ?? 48500000)}
                </Text>
                <Text style={styles.metricCellSub}>
                  {t('profileSetup.revenueTarget')}
                </Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricCellLabel}>
                  {t('profileSetup.occupancyRate')}
                </Text>
                <View style={styles.rateRow}>
                  <Text style={styles.metricCellValue}>{dashboard?.rooms?.occupancyRate || '95%'}</Text>
                  <Text style={styles.metricCellSub}>({dashboard?.rooms?.occupied ?? 19}/{dashboard?.rooms?.total ?? 20})</Text>
                </View>
                <Text style={styles.vacantWarningText}>
                  • {t('profileSetup.vacantRoom')}
                </Text>
              </View>
            </View>

            {/* Alert bar */}
            <View style={styles.alertBar}>
              <View style={styles.alertBarLeft}>
                <Receipt size={16} color={colors.secondary} />
                <Text style={styles.alertBarText}>
                  {dashboard?.pendingInvoices?.label || t('profileSetup.pendingInvoices')}
                </Text>
              </View>
              <View style={styles.approvePill}>
                <Text style={styles.approvePillText}>
                  {t('profileSetup.approveNow')}
                </Text>
              </View>
            </View>

            {/* 6 Micro Tabs Preview */}
            <View style={styles.microTabsRow}>
              <View style={styles.microTab}>
                <Grid size={15} color={colors.primary} />
                <Text style={[styles.microTabText, { color: colors.primary }]}>
                  {t('profileSetup.tabOverview')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <DoorOpen size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabRooms')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <FileText size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabInvoices')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <Zap size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabUtilities')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <Wrench size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabIssues')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <Settings size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabSettings')}
                </Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.landlordCtaButton}
            onPress={() => handleSelectRole('landlord')}
            activeOpacity={0.85}
            accessibilityLabel="Xem thử Dashboard Chủ trọ"
            accessibilityRole="button"
          >
            <Text style={styles.landlordCtaText}>
              {t('profileSetup.previewLandlordBtn')}
            </Text>
            <ArrowRight size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 4. CARD 2: Tenant Role */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'tenant' && styles.roleCardActive,
          ]}
          onPress={() => setSelectedRole('tenant')}
          activeOpacity={0.9}
        >
          {/* Header */}
          <View style={styles.roleCardHeader}>
            <View style={styles.roleCardHeaderLeft}>
              <View style={styles.roleIconCircleTenant}>
                <Key size={22} color={colors.secondary} />
              </View>
              <View>
                <View style={styles.roleTitleGroup}>
                  <Text style={styles.roleTitleText}>
                    {t('profileSetup.tenantRoleTitle')}
                  </Text>
                  <View style={styles.tenantBadge}>
                    <Text style={styles.tenantBadgeText}>
                      {t('profileSetup.tenantBadge')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.roleSubText}>
                  {t('profileSetup.tenantRoleSubtitle')}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.radioIndicator,
                selectedRole === 'tenant' && styles.radioIndicatorSelectedTenant,
              ]}
            >
              {selectedRole === 'tenant' && (
                <View style={[styles.radioDot, { backgroundColor: colors.secondaryContainer }]} />
              )}
            </View>
          </View>

          {/* Mini Preview Tenant */}
          <View style={styles.snapshotBox}>
            <View style={styles.snapshotTopRow}>
              <View style={styles.roomBadgeGroup}>
                <View style={styles.tenantDot} />
                <Text style={styles.tenantRoomTitle}>
                  {tenantWorkspace?.roomCode || t('profileSetup.room204')}
                </Text>
              </View>
              <View style={styles.issuedPill}>
                <Text style={styles.issuedPillText}>
                  {t('profileSetup.issuedBadge')}
                </Text>
              </View>
            </View>

            {/* Bill snapshot */}
            <View style={styles.tenantBillRow}>
              <View>
                <Text style={styles.metricCellLabel}>
                  {t('profileSetup.rentAndServices')}
                </Text>
                <Text style={styles.metricCellValue}>
                  {formatMoney(tenantWorkspace?.currentBillAmount ?? 3935000)}
                </Text>
              </View>
              <View style={styles.vietQrPill}>
                <QrCode size={16} color={colors.onPrimary} />
                <Text style={styles.vietQrText}>VietQR</Text>
              </View>
            </View>

            {/* Incident alert */}
            <View style={styles.alertBar}>
              <View style={styles.alertBarLeft}>
                <Wrench size={16} color={colors.primary} />
                <Text style={styles.alertBarText}>
                  {t('profileSetup.needTechSupport')}
                </Text>
              </View>
              <Text style={styles.reportNowText}>
                {t('profileSetup.reportNow')}
              </Text>
            </View>

            {/* 5 Micro Tabs Preview */}
            <View style={styles.microTabsRow}>
              <View style={styles.microTab}>
                <Home size={15} color={colors.primary} />
                <Text style={[styles.microTabText, { color: colors.primary }]}>
                  {t('profileSetup.tabHome')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <Receipt size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabInvoices')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <Zap size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabUtilities')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <MessageSquare size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabFeedback')}
                </Text>
              </View>
              <View style={styles.microTab}>
                <User size={15} color={colors.outline} />
                <Text style={styles.microTabText}>
                  {t('profileSetup.tabProfile')}
                </Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.tenantCtaButton}
            onPress={() => handleSelectRole('tenant')}
            activeOpacity={0.85}
            accessibilityLabel="Xem thử Trang chủ Khách thuê"
            accessibilityRole="button"
          >
            <Text style={styles.tenantCtaText}>
              {t('profileSetup.previewTenantBtn')}
            </Text>
            <ArrowRight size={18} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 5. Prototype Flow Graph Tree */}
        <View style={styles.flowGraphCard}>
          <View style={styles.flowGraphHeader}>
            <View style={styles.flowGraphTitleRow}>
              <GitFork size={18} color={colors.secondary} />
              <Text style={styles.flowGraphTitle}>
                {t('profileSetup.flowGraphTitle')}
              </Text>
            </View>
            <Text style={styles.flowGraphSub}>
              {t('profileSetup.flowGraphSub')}
            </Text>
          </View>

          <Text style={styles.flowGraphDesc}>
            {t('profileSetup.flowGraphDesc')}
          </Text>

          <View style={styles.flowNodesWrap}>
            <View style={styles.flowNode}>
              <Text style={styles.flowNodeText}>Splash</Text>
            </View>
            <ArrowRight size={14} color={colors.outline} />
            <View style={styles.flowNode}>
              <Text style={styles.flowNodeText}>Welcome</Text>
            </View>
            <ArrowRight size={14} color={colors.outline} />
            <View style={styles.flowNode}>
              <Text style={styles.flowNodeText}>Login</Text>
            </View>
          </View>
        </View>

        {/* 6. Floating Status Toast */}
        {!toastDismissed && (
          <TouchableOpacity
            style={styles.floatingToast}
            onPress={() => router.push('/dashboard')}
            onLongPress={() => setToastDismissed(true)}
            activeOpacity={0.9}
          >
            <CheckCircle2 size={18} color={colors.secondaryContainer} />
            <Text style={styles.floatingToastText}>
              {t('profileSetup.toastRedirect')}
            </Text>
            <ArrowRight size={16} color={colors.inverseOnSurface} />
          </TouchableOpacity>
        )}
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
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing['2xl'],
    gap: tokens.spacing.lg,
  },
  ambientBanner: {
    backgroundColor: colors.inverseSurface,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    ...tokens.shadows.md,
  },
  bannerGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 195, 41, 0.2)',
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: tokens.radii.full,
    alignSelf: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  verifiedChipText: {
    ...tokens.typography.caption,
    color: colors.secondaryContainer,
    fontWeight: '600',
  },
  bannerContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerTitle: {
    ...tokens.typography.titleSm,
    color: colors.inverseOnSurface,
    marginBottom: 4,
  },
  bannerDesc: {
    ...tokens.typography.bodySm,
    color: colors.onTertiaryContainer,
    maxWidth: 240,
    lineHeight: 20,
  },
  bannerMoonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(53, 37, 205, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    ...tokens.typography.caption,
    color: colors.secondaryContainer,
  },
  countdownBadge: {
    backgroundColor: 'rgba(121, 89, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.full,
  },
  countdownBadgeText: {
    ...tokens.typography.caption,
    color: colors.secondaryFixed,
    fontWeight: '600',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondaryContainer,
    borderRadius: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...tokens.typography.titleSm,
    color: colors.onSurface,
  },
  spacesBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
  },
  spacesBadgeText: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  roleCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...tokens.shadows.sm,
  },
  roleCardActive: {
    borderColor: colors.primaryContainer,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIconCircleLandlord: {
    width: 40,
    height: 40,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconCircleTenant: {
    width: 40,
    height: 40,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleTitleText: {
    ...tokens.typography.bodyBaseMedium,
    color: colors.onSurface,
  },
  adminBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.full,
  },
  adminBadgeText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  tenantBadge: {
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.full,
  },
  tenantBadgeText: {
    ...tokens.typography.caption,
    color: colors.onSecondaryFixedVariant,
    fontWeight: '600',
  },
  roleSubText: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  radioIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIndicatorSelected: {
    borderColor: colors.primary,
  },
  radioIndicatorSelectedTenant: {
    borderColor: colors.secondaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  snapshotBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  snapshotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  snapshotTopLabel: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  snapshotGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCell: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.DEFAULT,
  },
  metricCellLabel: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  metricCellValue: {
    ...tokens.typography.tabularAmount,
    color: colors.onSurface,
    fontWeight: '700',
  },
  metricCellSub: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  vacantWarningText: {
    ...tokens.typography.caption,
    color: colors.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(225, 232, 253, 0.8)',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.DEFAULT,
  },
  alertBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertBarText: {
    ...tokens.typography.bodySm,
    color: colors.onSurface,
  },
  approvePill: {
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radii.full,
  },
  approvePillText: {
    ...tokens.typography.caption,
    color: colors.onSecondaryFixedVariant,
    fontWeight: '600',
  },
  microTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.DEFAULT,
    paddingVertical: 6,
  },
  microTab: {
    alignItems: 'center',
    gap: 2,
  },
  microTabText: {
    fontSize: 9,
    color: colors.outline,
    fontWeight: '500',
  },
  landlordCtaButton: {
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
  landlordCtaText: {
    ...tokens.typography.bodySmMedium,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  tenantCtaButton: {
    width: '100%',
    height: 48,
    borderRadius: tokens.radii.DEFAULT,
    backgroundColor: colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tenantCtaText: {
    ...tokens.typography.bodySmMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  roomBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tenantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  tenantRoomTitle: {
    ...tokens.typography.titleSm,
    color: colors.onSurface,
  },
  issuedPill: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.full,
  },
  issuedPillText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  tenantBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.DEFAULT,
  },
  vietQrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radii.DEFAULT,
  },
  vietQrText: {
    ...tokens.typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  reportNowText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  flowGraphCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  flowGraphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flowGraphTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowGraphTitle: {
    ...tokens.typography.titleSm,
    color: colors.onSurface,
  },
  flowGraphSub: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  flowGraphDesc: {
    ...tokens.typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  flowNodesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    flexWrap: 'wrap',
  },
  flowNode: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radii.DEFAULT,
    ...tokens.shadows.sm,
  },
  flowNodeText: {
    ...tokens.typography.caption,
    fontWeight: '600',
    color: colors.onSurface,
  },
  floatingToast: {
    backgroundColor: colors.inverseSurface,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...tokens.shadows.lg,
  },
  floatingToastText: {
    ...tokens.typography.caption,
    color: colors.inverseOnSurface,
    flex: 1,
    lineHeight: 18,
  },
});
