import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  ShieldCheck,
  Calendar,
  Clock,
  Phone,
  Zap,
  Droplet,
  Wifi,
  LogOut,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useContractDetail, useContracts } from '../api/landlordApi';

export function ContractDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: contractsList } = useContracts();
  const contractId = (id as string) || contractsList?.[0]?._id || contractsList?.[0]?.id || 'contract-003';

  const { data: contract, isLoading } = useContractDetail(contractId);

  if (isLoading && !contract) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const contractData = contract || {
    _id: contractId,
    code: 'HD-2024-082',
    roomId: 'room-204',
    roomCode: 'Phòng 204',
    status: 'ACTIVE' as const,
    startDate: '2024-08-01',
    endDate: '2025-07-31',
    dueDay: 5,
    rent: 4500000,
    depositAmount: 4500000,
    depositStatus: 'COLLECTED',
    remainingMonths: 5,
    progressPercentage: 58,
    tenant: {
      id: 'tenant-003',
      fullName: 'Trần Anh Tuấn',
      phone: '0988 123 456',
      cccdMasked: '•••• •••• 1234',
    },
    terms: 'Thanh toán tiền phòng định kỳ từ ngày 1 đến ngày 5 mỗi tháng. Giữ gìn vệ sinh chung, trật tự sau 23h.',
  };

  const handleRenew = () => {
    Alert.alert('Gia hạn hợp đồng', 'Bạn có muốn gia hạn hợp đồng thêm 6 tháng hoặc 12 tháng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gia hạn 12 tháng',
        onPress: () => {
          Alert.alert('Thành công', 'Đã gia hạn hợp đồng HD-2024-082 đến 31/07/2026!');
        },
      },
    ]);
  };

  const handleTerminate = () => {
    Alert.alert(
      'Chấm dứt hợp đồng',
      'Bạn có chắc chắn muốn chuyển sang thủ tục trả phòng và hoàn cọc cho khách?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Tiến hành trả phòng',
          style: 'destructive',
          onPress: () => router.push(`/checkout-settlement?contractId=${contractId}`),
        },
      ]
    );
  };

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
        <Text style={styles.headerTitle}>Chi tiết hợp đồng</Text>
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <MoreVertical size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Overview Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={14} color={colors.primary} />
              <Text style={styles.verifiedBadgeText}>Đang hiệu lực</Text>
            </View>
            <View style={styles.remainingPill}>
              <Clock size={12} color={colors.onSurfaceVariant} />
              <Text style={styles.remainingPillText}>Còn {contractData.remainingMonths || 5} tháng</Text>
            </View>
          </View>

          <View style={styles.heroMiddleRow}>
            <View>
              <Text style={styles.roomCodeTitle}>{contractData.roomCode || 'Phòng 204'}</Text>
              <Text style={styles.contractCodeSub}>
                MoonLight Riverside · #{contractData.code}
              </Text>
            </View>
            <View style={styles.rentBlock}>
              <Text style={styles.rentAmount}>{formatMoney(contractData.rent)}</Text>
              <Text style={styles.rentUnit}>/ tháng</Text>
            </View>
          </View>

          {/* Progress Bar of Duration */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${contractData.progressPercentage || 58}%` },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelDate}>01/08/2024</Text>
              <Text style={styles.progressLabelDate}>Hạn: 31/07/2025 (12 tháng)</Text>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Calendar size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Kỳ thanh toán</Text>
                <Text style={styles.metricValue}>Ngày {contractData.dueDay || 5} mỗi tháng</Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#ffdf9f' }]}>
                <ShieldCheck size={16} color={colors.secondary} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Tiền cọc giữ chỗ</Text>
                <Text style={styles.metricValue}>{formatMoney(contractData.depositAmount)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Tenant Quick Profile Card */}
        <TouchableOpacity
          style={styles.tenantCard}
          activeOpacity={0.85}
          onPress={() => router.push(`/tenant-detail?id=${contractData.tenant?.id || 'tenant-003'}`)}
        >
          <View style={styles.tenantLeft}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7p4nJnq0m8iFPcugX1yPTFryFwEiGZgE3WYIwnc64YL2xdDQJ2QO7R0afnwLTkjSPvyHxjmvBPhpd6_9ZDCWuy8nSr7nLlwKs74TzA7AdTrE1fgloC3I6uabexmZufUN7waoDE5fc4CUAWClovU-ezPohD6fsBdoH6xNQPcN0doqlRHuJ1YlwQ-9pIbo8X59xZj00NWfhI4Tg9JhnbAyFlLA6G-7IBQpwsqu-AsI',
              }}
              style={styles.tenantAvatar}
            />
            <View>
              <Text style={styles.tenantName}>{contractData.tenant?.fullName || 'Trần Anh Tuấn'}</Text>
              <Text style={styles.tenantSub}>
                {contractData.tenant?.phone || '0988 123 456'} · CCCD đã định danh
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.callIconBtn}
            onPress={() => Linking.openURL(`tel:${contractData.tenant?.phone || '0988123456'}`)}
          >
            <Phone size={16} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 4. Applied Utility Rates */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionCardTitle}>Dịch vụ & Biểu phí</Text>
            <Text style={styles.sectionCardSub}>Theo chỉ số thực tế</Text>
          </View>

          <View style={styles.utilityRows}>
            <View style={styles.utilityItem}>
              <View style={styles.utilityLeft}>
                <View style={[styles.utilityIconWrap, { backgroundColor: '#fff3e0' }]}>
                  <Zap size={16} color="#e65100" />
                </View>
                <View>
                  <Text style={styles.utilityName}>Điện sinh hoạt</Text>
                  <Text style={styles.utilityNote}>Đồng hồ công tơ riêng</Text>
                </View>
              </View>
              <Text style={styles.utilityRate}>3.500 ₫ <Text style={styles.rateUnit}>/ kWh</Text></Text>
            </View>

            <View style={styles.utilityItem}>
              <View style={styles.utilityLeft}>
                <View style={[styles.utilityIconWrap, { backgroundColor: '#e1f5fe' }]}>
                  <Droplet size={16} color="#0288d1" />
                </View>
                <View>
                  <Text style={styles.utilityName}>Nước máy sinh hoạt</Text>
                  <Text style={styles.utilityNote}>Đồng hồ kiểm định</Text>
                </View>
              </View>
              <Text style={styles.utilityRate}>25.000 ₫ <Text style={styles.rateUnit}>/ m³</Text></Text>
            </View>

            <View style={styles.utilityItem}>
              <View style={styles.utilityLeft}>
                <View style={[styles.utilityIconWrap, { backgroundColor: colors.surfaceContainer }]}>
                  <Wifi size={16} color={colors.onSurface} />
                </View>
                <View>
                  <Text style={styles.utilityName}>Wifi & Rác sinh hoạt</Text>
                  <Text style={styles.utilityNote}>Trọn gói mỗi tháng</Text>
                </View>
              </View>
              <Text style={styles.utilityRate}>100.000 ₫ <Text style={styles.rateUnit}>/ phòng</Text></Text>
            </View>
          </View>
        </View>

        {/* 5. Terms & Rules */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Điều khoản thỏa thuận</Text>
          <Text style={styles.termsContentText}>{contractData.terms}</Text>
        </View>
      </ScrollView>

      {/* 6. Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={styles.renewBtn}
          activeOpacity={0.8}
          onPress={handleRenew}
        >
          <RefreshCw size={16} color={colors.primary} />
          <Text style={styles.renewBtnText}>Gia hạn</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moveOutBtn}
          activeOpacity={0.8}
          onPress={handleTerminate}
        >
          <LogOut size={16} color="#ffffff" />
          <Text style={styles.moveOutBtnText}>Thủ tục trả phòng</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e2dfff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  remainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  remainingPillText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  heroMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  roomCodeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
  },
  contractCodeSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  rentBlock: {
    alignItems: 'flex-end',
  },
  rentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  rentUnit: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  progressContainer: {
    gap: 4,
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelDate: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
    marginTop: 4,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  tenantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tenantSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionCardSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  utilityRows: {
    gap: tokens.spacing.sm,
  },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
  },
  utilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  utilityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  utilityNote: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  utilityRate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  rateUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
  },
  termsContentText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: tokens.spacing.margin,
    paddingVertical: tokens.spacing.md,
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    ...tokens.shadows.md,
  },
  renewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    height: 48,
    borderRadius: tokens.radii.md,
  },
  renewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  moveOutBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.error,
    height: 48,
    borderRadius: tokens.radii.md,
  },
  moveOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
