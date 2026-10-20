import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  MessageSquare,
  Building,
  User,
  ShieldCheck,
  Zap,
  Droplet,
  FileText,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  LogOut,
  UserPlus,
  KeyRound,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useRoomDetail, useContracts } from '../api/landlordApi';

type TabKey = 'OVERVIEW' | 'CONTRACT' | 'METERS' | 'INVOICES';

export function RoomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = (id as string) || 'room-204';

  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');

  const { data: room, isLoading } = useRoomDetail(roomId);
  const { data: contracts } = useContracts({ roomId });
  const activeContract = contracts?.[0];

  if (isLoading && !room) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const roomData = room || {
    _id: roomId,
    code: 'Phòng 204',
    floor: 2,
    status: 'VACANT' as const,
    rent: 4500000,
    deposit: 4500000,
    area: 30,
    feature: 'Ban công & Gác đúc',
    tenant: null,
  };

  const isOccupied = roomData.status === 'OCCUPIED' || Boolean(activeContract);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết phòng</Text>
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <MoreVertical size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Visual Snapshot Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcGJtv6IdFkJSN8j-zDOw4YjbYf2vR5u62jbcM_GIJBeNWyPcVWn2GJpWlTy0LHbPd9O-J1AJC9yvvdb06EJdZNPRqnXZokV5ubw9BX_reSRDNlfpLbQFdCt55s_bUC474z8sAM22dDvZgPSuGo8T9KdSk6KKhNg1YuKTH5bao6ZqzFSE7k2vZJa3lfeEVm5YVoS5Hs3h7EBbUKjjEc0riUyRy1D9nMXGCYZQB5Do',
            }}
            style={styles.bannerImage}
          />
          <View style={styles.bannerGradient} />

          {/* Floating Top Badges */}
          <View style={styles.bannerTopRow}>
            <View style={styles.propertyTag}>
              <Building size={13} color={colors.primary} />
              <Text style={styles.propertyTagText}>Tầng {roomData.floor} • MoonLight</Text>
            </View>
            <View
              style={[
                styles.statusTag,
                isOccupied
                  ? { backgroundColor: '#e2dfff' }
                  : { backgroundColor: '#e8f5e9' },
              ]}
            >
              <User size={13} color={isOccupied ? colors.primary : '#2e7d32'} />
              <Text
                style={[
                  styles.statusTagText,
                  { color: isOccupied ? colors.primary : '#2e7d32' },
                ]}
              >
                {isOccupied ? 'Đang thuê' : 'Phòng trống'}
              </Text>
            </View>
          </View>

          {/* Bottom Overlay Info */}
          <View style={styles.bannerBottomRow}>
            <View>
              <Text style={styles.bannerRoomCode}>{roomData.code}</Text>
              <Text style={styles.bannerRoomSpecs}>
                {roomData.area || 30} m² • {roomData.feature || 'Ban công & Gác lửng'}
              </Text>
            </View>
            <View style={styles.bannerRentBlock}>
              <Text style={styles.bannerRentLabel}>Tiền thuê</Text>
              <Text style={styles.bannerRentAmount}>
                {formatMoney(roomData.rent)}
                <Text style={styles.bannerRentUnit}>/th</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Primary Tenant Contact Pill Card OR Vacant Action Card */}
        {isOccupied && (roomData.tenant || activeContract?.tenant) ? (
          <TouchableOpacity
            style={styles.tenantPillCard}
            activeOpacity={0.9}
            onPress={() => router.push(`/tenant-detail?id=${roomData.tenant?.id || activeContract?.tenant?.id || 'tenant-003'}`)}
          >
            <View style={styles.tenantPillLeft}>
              <View style={styles.tenantAvatarWrapper}>
                <Image
                  source={{
                    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7p4nJnq0m8iFPcugX1yPTFryFwEiGZgE3WYIwnc64YL2xdDQJ2QO7R0afnwLTkjSPvyHxjmvBPhpd6_9ZDCWuy8nSr7nLlwKs74TzA7AdTrE1fgloC3I6uabexmZufUN7waoDE5fc4CUAWClovU-ezPohD6fsBdoH6xNQPcN0doqlRHuJ1YlwQ-9pIbo8X59xZj00NWfhI4Tg9JhnbAyFlLA6G-7IBQpwsqu-AsI',
                  }}
                  style={styles.tenantAvatar}
                />
                <View style={styles.verifiedCheckBadge}>
                  <ShieldCheck size={10} color="#ffffff" />
                </View>
              </View>
              <View style={styles.tenantInfo}>
                <View style={styles.tenantNameRow}>
                  <Text style={styles.tenantName}>
                    {roomData.tenant?.fullName || activeContract?.tenant?.fullName || 'Khách thuê'}
                  </Text>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>Trưởng phòng</Text>
                  </View>
                </View>
                <Text style={styles.tenantPhone}>
                  {roomData.tenant?.phone || activeContract?.tenant?.phone || 'Chưa cập nhật SĐT'}
                </Text>
              </View>
            </View>

            <View style={styles.tenantActions}>
              {(roomData.tenant?.phone || activeContract?.tenant?.phone) && (
                <TouchableOpacity
                  style={styles.actionCircleBtn}
                  onPress={() => Linking.openURL(`tel:${roomData.tenant?.phone || activeContract?.tenant?.phone}`)}
                >
                  <Phone size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionCircleBtn}
                onPress={() => router.push(`/tenant-detail?id=${roomData.tenant?.id || activeContract?.tenant?.id || 'tenant-003'}`)}
              >
                <MessageSquare size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.vacantHeroCard}>
            <View style={styles.vacantHeroHeader}>
              <View style={styles.vacantBadge}>
                <CheckCircle2 size={13} color="#10b981" />
                <Text style={styles.vacantBadgeText}>Phòng trống • Sẵn sàng đón khách</Text>
              </View>
              <Text style={styles.vacantPriceHighlight}>
                {formatMoney(roomData.rent)}/th
              </Text>
            </View>
            <Text style={styles.vacantHeroDesc}>
              Phòng hiện chưa có khách thuê. Nhấn nút bên dưới để tiến hành bàn giao phòng và lập hợp đồng mới ngay.
            </Text>
            <TouchableOpacity
              style={styles.vacantCheckinBtn}
              activeOpacity={0.85}
              onPress={() => router.push(`/checkin-wizard?roomId=${roomData._id || roomId}`)}
            >
              <UserPlus size={16} color="#ffffff" />
              <Text style={styles.vacantCheckinBtnText}>Lập hợp đồng & Bàn giao ngay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.vacantCreateAccountBtn}
              activeOpacity={0.85}
              onPress={() => router.push(`/create-tenant?roomId=${roomData._id || roomId}`)}
            >
              <KeyRound size={16} color={colors.primary} />
              <Text style={styles.vacantCreateAccountBtnText}>Cấp tài khoản đăng nhập cho khách</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Tab Switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'OVERVIEW' && styles.activeTabBtn]}
            onPress={() => setActiveTab('OVERVIEW')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'OVERVIEW' && styles.activeTabBtnText]}>
              Tổng quan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'CONTRACT' && styles.activeTabBtn]}
            onPress={() => setActiveTab('CONTRACT')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'CONTRACT' && styles.activeTabBtnText]}>
              Hợp đồng
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'METERS' && styles.activeTabBtn]}
            onPress={() => setActiveTab('METERS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'METERS' && styles.activeTabBtnText]}>
              Công tơ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'INVOICES' && styles.activeTabBtn]}
            onPress={() => setActiveTab('INVOICES')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'INVOICES' && styles.activeTabBtnText]}>
              Hóa đơn
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 5. Tab Panels */}
        {activeTab === 'OVERVIEW' && (
          <View style={styles.tabContentGroup}>
            {/* Financial Ledger Widget */}
            <View style={styles.financialRow}>
              <View style={styles.financialCard}>
                <View style={styles.financialCardHeader}>
                  <Lock size={15} color={colors.secondary} />
                  <Text style={styles.financialCardLabel}>
                    {isOccupied ? 'Tiền cọc giữ' : 'Tiền cọc niêm yết'}
                  </Text>
                </View>
                <Text style={styles.financialCardAmount}>
                  {formatMoney(roomData.deposit || activeContract?.depositAmount || 4500000)}
                </Text>
                <Text style={styles.financialCardSub}>Quỹ MoonLight giữ an toàn</Text>
              </View>

              <View style={styles.financialCard}>
                <View style={styles.financialCardHeader}>
                  <Calendar size={15} color={colors.primary} />
                  <Text style={styles.financialCardLabel}>Kỳ thu tiền</Text>
                </View>
                <Text style={styles.financialCardAmount}>
                  Ngày {activeContract?.dueDay || 5}
                </Text>
                <Text style={styles.financialCardSub}>Định kỳ hàng tháng</Text>
              </View>
            </View>

            {/* Utility Meters Snapshot */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Chỉ số công tơ hiện tại</Text>
              {isOccupied ? (
                <View style={styles.meterRows}>
                  <View style={styles.meterRowItem}>
                    <View style={styles.meterLeft}>
                      <View style={[styles.meterIconPill, { backgroundColor: '#fff3e0' }]}>
                        <Zap size={16} color="#e65100" />
                      </View>
                      <View>
                        <Text style={styles.meterName}>Công tơ điện</Text>
                        <Text style={styles.meterRate}>3.500 ₫/kWh</Text>
                      </View>
                    </View>
                    <Text style={styles.meterReadingValue}>1.450 kWh</Text>
                  </View>

                  <View style={styles.meterRowItem}>
                    <View style={styles.meterLeft}>
                      <View style={[styles.meterIconPill, { backgroundColor: '#e1f5fe' }]}>
                        <Droplet size={16} color="#0288d1" />
                      </View>
                      <View>
                        <Text style={styles.meterName}>Đồng hồ nước</Text>
                        <Text style={styles.meterRate}>25.000 ₫/m³</Text>
                      </View>
                    </View>
                    <Text style={styles.meterReadingValue}>82 m³</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptySubText}>
                  Chỉ số điện nước ban đầu sẽ được ghi nhận khi bạn thực hiện bàn giao nhận phòng.
                </Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'CONTRACT' && (
          <View style={styles.tabContentGroup}>
            {activeContract ? (
              <TouchableOpacity
                style={styles.contractPreviewCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/contract-detail?id=${activeContract._id || activeContract.id}`)}
              >
                <View style={styles.contractPreviewHeader}>
                  <View style={styles.contractPreviewTitleRow}>
                    <FileText size={18} color={colors.primary} />
                    <Text style={styles.contractCodeText}>HĐ #{activeContract.code || 'HD-2024'}</Text>
                  </View>
                  <View style={styles.contractActiveBadge}>
                    <CheckCircle2 size={12} color="#2e7d32" />
                    <Text style={styles.contractActiveBadgeText}>
                      {activeContract.status === 'ACTIVE' ? 'Đang hiệu lực' : activeContract.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.contractPeriodText}>
                  Thời hạn: {activeContract.startDate} - {activeContract.endDate}
                </Text>
                <View style={styles.contractActionHint}>
                  <Text style={styles.contractActionHintText}>Xem chi tiết điều khoản hợp đồng</Text>
                  <ArrowRight size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyContractCard}>
                <FileText size={36} color={colors.outline} />
                <Text style={styles.emptyContractTitle}>Chưa có hợp đồng nào</Text>
                <Text style={styles.emptyContractSubtitle}>
                  Phòng đang trống. Hãy tiến hành lập hợp đồng nhận phòng để kích hoạt quản lý khách thuê.
                </Text>
                <TouchableOpacity
                  style={styles.emptyContractActionBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/checkin-wizard?roomId=${roomData._id || roomId}`)}
                >
                  <UserPlus size={16} color="#ffffff" />
                  <Text style={styles.emptyContractActionText}>Lập hợp đồng nhận phòng ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === 'METERS' && (
          <View style={styles.tabContentGroup}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Lịch sử chỉ số</Text>
              {isOccupied ? (
                <>
                  <Text style={styles.emptySubText}>Kỳ T3/2025: Điện 1.450 kWh • Nước 82 m³</Text>
                  <Text style={styles.emptySubText}>Kỳ T2/2025: Điện 1.320 kWh • Nước 76 m³</Text>
                </>
              ) : (
                <Text style={styles.emptySubText}>Chưa có lịch sử chỉ số cho phòng này.</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'INVOICES' && (
          <View style={styles.tabContentGroup}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Hóa đơn gần nhất</Text>
              {isOccupied ? (
                <>
                  <Text style={styles.emptySubText}>HĐ T3/2025: 4.500.000 ₫ (Đã thanh toán)</Text>
                  <Text style={styles.emptySubText}>HĐ T2/2025: 4.350.000 ₫ (Đã thanh toán)</Text>
                </>
              ) : (
                <Text style={styles.emptySubText}>Chưa có hóa đơn phát sinh cho phòng này.</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 6. Sticky Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        {isOccupied ? (
          <TouchableOpacity
            style={styles.checkoutBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push(
                `/checkout-settlement?contractId=${activeContract?._id || activeContract?.id || 'contract-003'}&roomId=${roomData._id || roomId}`
              )
            }
          >
            <LogOut size={18} color="#ffffff" />
            <Text style={styles.checkoutBtnText}>Thủ tục trả phòng & Hoàn cọc</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.checkinBtn}
            activeOpacity={0.85}
            onPress={() => router.push(`/checkin-wizard?roomId=${roomData._id || roomId}`)}
          >
            <UserPlus size={18} color="#ffffff" />
            <Text style={styles.checkinBtnText}>Lập hợp đồng & Bàn giao phòng</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 56,
    paddingHorizontal: tokens.spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.md,
    paddingBottom: 100,
    gap: tokens.spacing.md,
  },
  bannerContainer: {
    height: 190,
    borderRadius: tokens.radii.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceContainer,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 27, 43, 0.45)',
  },
  bannerTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  propertyTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bannerBottomRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bannerRoomCode: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerRoomSpecs: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  bannerRentBlock: {
    alignItems: 'flex-end',
  },
  bannerRentLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
  },
  bannerRentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffdf9f',
  },
  bannerRentUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#ffffff',
  },
  tenantPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  tenantPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  tenantAvatarWrapper: {
    position: 'relative',
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  roleTag: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  tenantPhone: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  tenantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingVertical: 2,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
  },
  activeTabBtn: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  activeTabBtnText: {
    color: '#ffffff',
  },
  tabContentGroup: {
    gap: tokens.spacing.md,
  },
  financialRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  financialCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: 4,
    ...tokens.shadows.sm,
  },
  financialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  financialCardLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  financialCardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  financialCardSub: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  meterRows: {
    gap: tokens.spacing.sm,
  },
  meterRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
  },
  meterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  meterIconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  meterRate: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  meterReadingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  emptySubText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  contractPreviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  contractPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractPreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  contractActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  contractActiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e7d32',
  },
  contractPeriodText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  contractActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    paddingTop: tokens.spacing.sm,
  },
  contractActionHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: tokens.spacing.margin,
    paddingVertical: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    ...tokens.shadows.md,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: tokens.radii.md,
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: tokens.radii.md,
  },
  checkinBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  vacantHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: '#e2dfff',
    ...tokens.shadows.sm,
  },
  vacantHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vacantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vacantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2e7d32',
  },
  vacantPriceHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  vacantHeroDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  vacantCheckinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: tokens.radii.md,
    marginTop: 4,
    ...tokens.shadows.sm,
  },
  vacantCheckinBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  vacantCreateAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(92, 225, 230, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(92, 225, 230, 0.25)',
    borderRadius: tokens.radii.md,
    height: 44,
    gap: 8,
    marginTop: tokens.spacing.sm,
  },
  vacantCreateAccountBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContractCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    gap: tokens.spacing.xs,
  },
  emptyContractTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  emptyContractSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  emptyContractActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 8,
    borderRadius: tokens.radii.full,
    ...tokens.shadows.sm,
  },
  emptyContractActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
