import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  Bell,
  ChevronDown,
  Repeat,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Zap,
  QrCode,
  UserPlus,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useLandlordDashboard, useProperties } from '../api/landlordApi';
import { LandlordBottomNav } from '../components/LandlordBottomNav';

export function LandlordDashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const { data: properties } = useProperties();
  const firstProperty = properties?.[0];
  const activePropertyId =
    selectedPropertyId || firstProperty?._id || firstProperty?.id || '';

  const { data: dashboard, isLoading, refetch, isRefetching } = useLandlordDashboard(activePropertyId);

  const currentProperty =
    properties?.find((p) => (p.id || p._id) === activePropertyId) ||
    firstProperty || {
      name: 'Dãy trọ MOONLIGHT',
      address: 'Đường 24A, KDC Tân Đức, Đức Hòa, Long An',
      totalRooms: dashboard?.rooms?.total || 0,
    };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../../assets/images/icon.png')}
            style={styles.logoIcon}
          />
          <View style={styles.propertyHeaderGroup}>
            <TouchableOpacity
              style={styles.propertyDropdownBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (properties && properties.length > 1) {
                  const nextProp = properties.find((p) => (p.id || p._id) !== selectedPropertyId);
                  if (nextProp) setSelectedPropertyId(nextProp.id || nextProp._id);
                }
              }}
            >
              <Building2 size={16} color={colors.secondary} />
              <Text style={styles.propertyHeaderText} numberOfLines={1}>
                {currentProperty.name}
              </Text>
              <ChevronDown size={14} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={styles.headerSubtitle}>Tổng quan quản trị</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Bell size={20} color={colors.onSurfaceVariant} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            activeOpacity={0.7}
            onPress={async () => {
              if (isAuthenticated) {
                await logout();
                router.replace('/login');
              } else {
                router.push('/login');
              }
            }}
          >
            <Text style={styles.avatarText}>
              {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'ML'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isLoading}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
      >
        {/* 2. Property Switcher Card */}
        <View style={styles.propertyBannerCard}>
          <View style={styles.propertyBannerLeft}>
            <View style={styles.propertyIconContainer}>
              <Building2 size={22} color={colors.primary} />
            </View>
            <View style={styles.propertyInfo}>
              <View style={styles.propertyNameRow}>
                <Text style={styles.propertyNameText} numberOfLines={1}>
                  {currentProperty.name} ({currentProperty.totalRooms || 24} phòng)
                </Text>
              </View>
              <Text style={styles.propertyAddressText} numberOfLines={1}>
                {currentProperty.address}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.switchPropBtn}
            onPress={() => {
              if (properties && properties.length > 1) {
                const nextProp = properties.find((p) => (p.id || p._id) !== selectedPropertyId);
                if (nextProp) setSelectedPropertyId(nextProp.id || nextProp._id);
              }
            }}
          >
            <Repeat size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* 3. 4 Stat Cards Grid (2x2) */}
        <View style={styles.statsGrid}>
          {/* Stat 1: Doanh thu kỳ này */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Doanh thu kỳ này</Text>
              <View style={[styles.statIconBadge, { backgroundColor: colors.surfaceContainer }]}>
                <TrendingUp size={14} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.statAmount}>
              {formatMoney(dashboard?.finance?.currentRevenue ?? 0)}
            </Text>
            <View style={styles.statSubRow}>
              <TrendingUp size={12} color={colors.secondary} />
              <Text style={[styles.statSubText, { color: colors.secondary }]}>
                +{dashboard?.momGrowth ?? 0}% so với kỳ trước
              </Text>
            </View>
          </View>

          {/* Stat 2: Công nợ */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Công nợ</Text>
              <View style={[styles.statIconBadge, { backgroundColor: colors.errorContainer }]}>
                <AlertCircle size={14} color={colors.error} />
              </View>
            </View>
            <Text style={[styles.statAmount, { color: colors.error }]}>
              {formatMoney(dashboard?.finance?.totalDebt ?? 0)}
            </Text>
            <View style={styles.statSubRow}>
              <Clock size={12} color={colors.error} />
              <Text style={[styles.statSubText, { color: colors.error }]}>
                {dashboard?.finance?.totalDebt ? 'Có hóa đơn chưa thu' : 'Không có công nợ'}
              </Text>
            </View>
          </View>

          {/* Stat 3: Phòng thuê */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => router.push('/rooms')}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Phòng thuê</Text>
              <View style={[styles.statIconBadge, { backgroundColor: colors.surfaceContainer }]}>
                <CheckCircle2 size={14} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.statAmount}>
              {dashboard?.rooms?.occupied ?? 0}/{dashboard?.rooms?.total ?? 0} phòng
            </Text>
            <View style={styles.statSubRow}>
              <View style={styles.liveOccupancyDot} />
              <Text style={styles.statSubText}>
                {dashboard?.rooms?.occupancyRate ?? '0%'} lấp đầy • {dashboard?.rooms?.vacant ?? 0} trống
              </Text>
            </View>
          </TouchableOpacity>

          {/* Stat 4: Yêu cầu mới */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>Yêu cầu mới</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#ffdf9f' }]}>
                <Wrench size={14} color={colors.secondary} />
              </View>
            </View>
            <Text style={styles.statAmount}>0 phản ánh</Text>
            <View style={styles.statSubRow}>
              <AlertCircle size={12} color={colors.secondary} />
              <Text style={[styles.statSubText, { color: colors.secondary }]}>Hệ thống vận hành tốt</Text>
            </View>
          </View>
        </View>

        {/* 4. Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <Text style={styles.sectionSubtitle}>Tiện ích quản lý</Text>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionBtn, styles.primaryQuickAction]}
            activeOpacity={0.8}
            onPress={() => router.push('/rooms')}
          >
            <View style={styles.actionIconPillPrimary}>
              <Zap size={18} color="#ffffff" />
            </View>
            <Text style={styles.actionLabelPrimary}>Ghi điện nước</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/checkin-wizard')}
          >
            <View style={styles.actionIconPill}>
              <QrCode size={18} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Thu VietQR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/create-tenant')}
          >
            <View style={[styles.actionIconPill, { backgroundColor: '#ffdf9f' }]}>
              <UserPlus size={18} color={colors.secondary} />
            </View>
            <Text style={styles.actionLabel}>Tạo người thuê</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/create-room')}
          >
            <View style={styles.actionIconPill}>
              <Plus size={18} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Tạo phòng</Text>
          </TouchableOpacity>
        </View>

        {/* 4.5. Tenant Account Creation Banner */}
        <TouchableOpacity
          style={styles.tenantAccountBanner}
          activeOpacity={0.85}
          onPress={() => router.push('/create-tenant')}
        >
          <View style={styles.tenantAccountBannerLeft}>
            <View style={styles.tenantAccountIconWrapper}>
              <UserPlus size={20} color={colors.secondaryContainer} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.tenantAccountBannerTitle}>Cấp tài khoản khách thuê</Text>
              <Text style={styles.tenantAccountBannerSubtitle}>
                Tạo tài khoản & mật khẩu để người thuê tự đăng nhập vào app
              </Text>
            </View>
          </View>
          <View style={styles.tenantAccountBannerArrow}>
            <ArrowRight size={16} color={colors.secondaryContainer} />
          </View>
        </TouchableOpacity>

        {/* 5. Visual AI Spotlight Banner */}
        <View style={styles.aiSpotlightCard}>
          <View style={styles.aiSpotlightContent}>
            <View style={styles.aiBadge}>
              <Sparkles size={11} color={colors.secondary} />
              <Text style={styles.aiBadgeText}>Kỳ chốt số T3/2025</Text>
            </View>
            <Text style={styles.aiTitle}>Tự động tính hóa đơn AI</Text>
            <Text style={styles.aiSubtitle} numberOfLines={2}>
              Chụp ảnh đồng hồ để tạo hoá đơn trong 3s
            </Text>
          </View>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKcnzqkUKl7cDKdOLdy3lVe-wZ7ANm7rvCZeGoHoJVOzq9AmGjgKOsjDmm0VkrbzuZpPyslZ5iX2uo1zCmjX0YvE7zw8j5VnUQmsfVmjzUdWv4HNhnVWhRTEMiJDLbWv8PvChiEtk8PuQoiOk5o30YNa5Cupi0xcQvrtDKMMpdBDxPor7d4Lt9eWkC7SmRXCH233MuhHwX36FUHC-keleLHSSwYSWd0B5eW5bFDYc',
            }}
            style={styles.aiImage}
          />
        </View>

        {/* 6. Action Items Today */}
        <View style={styles.sectionHeader}>
          <View style={styles.todayTitleRow}>
            <Text style={styles.sectionTitle}>Cần xử lý hôm nay</Text>
            <View
              style={[
                styles.urgentBadge,
                (!dashboard?.rooms?.total || dashboard.rooms.total === 0) && {
                  backgroundColor: colors.surfaceContainer,
                },
              ]}
            >
              <Text
                style={[
                  styles.urgentBadgeText,
                  (!dashboard?.rooms?.total || dashboard.rooms.total === 0) && {
                    color: colors.onSurfaceVariant,
                  },
                ]}
              >
                {!dashboard?.rooms?.total || dashboard.rooms.total === 0 ? '0 việc' : 'Đang quản lý'}
              </Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/rooms')}>
            <Text style={styles.viewAllLink}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionItemsList}>
          {!dashboard?.rooms?.total || dashboard.rooms.total === 0 ? (
            <View style={styles.actionItemCard}>
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionItemIcon, { backgroundColor: colors.surfaceContainer }]}>
                  <Plus size={18} color={colors.primary} />
                </View>
                <View style={styles.actionItemTextGroup}>
                  <Text style={styles.actionItemTitle}>Dãy trọ chưa có phòng nào</Text>
                  <Text style={styles.actionItemDetail}>Tạo các phòng trọ để bắt đầu bàn giao cho khách thuê</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={() => router.push('/create-room')}
              >
                <Text style={styles.actionButtonText}>Tạo ngay</Text>
                <ArrowRight size={13} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionItemCard}>
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionItemIcon, { backgroundColor: '#e8f5e9' }]}>
                  <CheckCircle2 size={18} color="#2e7d32" />
                </View>
                <View style={styles.actionItemTextGroup}>
                  <Text style={styles.actionItemTitle}>Hệ thống vận hành ổn định</Text>
                  <Text style={styles.actionItemDetail}>
                    {dashboard.rooms.occupied} phòng đang thuê • {dashboard.rooms.vacant} phòng trống
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.surfaceContainer }]}
                activeOpacity={0.8}
                onPress={() => router.push('/rooms')}
              >
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Xem phòng</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation */}
      <LandlordBottomNav activeTab="dashboard" roomsCount={dashboard?.rooms?.total ?? 0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    height: 60,
    paddingHorizontal: tokens.spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  propertyHeaderGroup: {
    flex: 1,
  },
  propertyDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  propertyHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    maxWidth: 160,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ffc329',
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.md,
    paddingBottom: 40,
    gap: tokens.spacing.lg,
  },
  propertyBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    ...tokens.shadows.sm,
  },
  propertyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  propertyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: tokens.radii.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  propertyNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  propertyAddressText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  switchPropBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: 6,
    ...tokens.shadows.sm,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  statIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statSubText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  liveOccupancyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffc329',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: 4,
    borderRadius: tokens.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...tokens.shadows.sm,
  },
  primaryQuickAction: {
    backgroundColor: colors.primary,
  },
  actionIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconPillPrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
  },
  actionLabelPrimary: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  aiSpotlightCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  aiSpotlightContent: {
    flex: 1,
    gap: 4,
    paddingRight: tokens.spacing.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffdf9f',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  aiSubtitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  aiImage: {
    width: 72,
    height: 72,
    borderRadius: tokens.radii.md,
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  urgentBadge: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  viewAllLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  actionItemsList: {
    gap: tokens.spacing.sm,
  },
  actionItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...tokens.shadows.sm,
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  actionItemIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItemTextGroup: {
    flex: 1,
    gap: 2,
  },
  actionItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  smallChip: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  smallChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  actionItemDetail: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  actionItemDue: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radii.md,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  tenantAccountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(92, 225, 230, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(92, 225, 230, 0.25)',
    borderRadius: tokens.radii.xl,
    padding: tokens.spacing.base,
    marginBottom: tokens.spacing.base,
  },
  tenantAccountBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tenantAccountIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(92, 225, 230, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantAccountBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tenantAccountBannerSubtitle: {
    fontSize: 12,
    color: colors.outline,
    marginTop: 2,
  },
  tenantAccountBannerArrow: {
    marginLeft: 8,
  },
});
