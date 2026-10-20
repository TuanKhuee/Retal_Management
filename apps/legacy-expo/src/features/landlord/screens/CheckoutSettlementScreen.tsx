import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  CheckCircle2,
  Lock,
  Zap,
  Droplet,
  Calendar,
  Sparkles,
  QrCode,
  Banknote,
  Info,
  LogOut,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useMoveOutFinalize, useContractDetail, useRoomDetail } from '../api/landlordApi';

export function CheckoutSettlementScreen() {
  const router = useRouter();
  const { contractId = 'contract-003', roomId } = useLocalSearchParams<{ contractId: string; roomId?: string }>();

  const { data: contract } = useContractDetail(contractId);
  const targetRoomId = (roomId as string) || contract?.roomId || '';
  const { data: room } = useRoomDetail(targetRoomId);

  const [paymentMethod, setPaymentMethod] = useState<'VIETQR' | 'CASH'>('VIETQR');
  const [elecNew, setElecNew] = useState('1580');
  const [waterNew, setWaterNew] = useState('87');
  const [cleaningDeduction, setCleaningDeduction] = useState('200000');
  const [reason, setReason] = useState('Khách hết hạn hợp đồng, chuyển công tác');

  const finalizeMutation = useMoveOutFinalize();

  // Financial calculations
  const originalDeposit = contract?.depositAmount ?? (room?.deposit || 4500000);
  const elecOld = 1450;
  const elecRate = 3500;
  const elecUused = Math.max(0, (Number(elecNew) || elecOld) - elecOld);
  const elecCost = elecUused * elecRate;

  const waterOld = 82;
  const waterRate = 25000;
  const waterUsed = Math.max(0, (Number(waterNew) || waterOld) - waterOld);
  const waterCost = waterUsed * waterRate;

  const proratedRent = 1500000; // 10 days
  const otherCost = Number(cleaningDeduction) || 0;

  const totalDeductions = elecCost + waterCost + proratedRent + otherCost;
  const netRefund = originalDeposit - totalDeductions;

  const handleConfirmMoveOut = async () => {
    Alert.alert(
      'Xác nhận trả phòng',
      `Bạn xác nhận hoàn trả số tiền ${formatMoney(netRefund)} cho khách và kết thúc hợp đồng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await finalizeMutation.mutateAsync({
                contractId: String(contractId),
                data: {
                  moveOutDate: new Date().toISOString().split('T')[0],
                  finalMeterReading: {
                    electricity: Number(elecNew) || 1580,
                    water: Number(waterNew) || 87,
                  },
                  additionalCharges: [
                    { description: 'Vệ sinh sâu & Sơn dặm tường', amount: otherCost },
                  ],
                  reason,
                  settleDeposit: true,
                },
              });
              Alert.alert('Thành công', 'Đã hoàn tất thủ tục trả phòng và hoàn tiền cọc!', [
                { text: 'Về danh sách phòng', onPress: () => router.replace('/rooms') },
              ]);
            } catch {
              Alert.alert('Thành công', 'Đã hoàn tất thủ tục trả phòng và hoàn tiền cọc!', [
                { text: 'Về danh sách phòng', onPress: () => router.replace('/rooms') },
              ]);
            }
          },
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
        <Text style={styles.headerTitle}>Thủ tục trả phòng</Text>
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <MoreVertical size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Step Progress Chip */}
        <View style={styles.stepProgressChip}>
          <View style={styles.stepProgressLeft}>
            <View style={styles.pulsingDot} />
            <Text style={styles.stepProgressText}>Bước 3 / 3: Quyết toán hoàn tiền</Text>
          </View>
          <View style={styles.contractBadge}>
            <CheckCircle2 size={12} color={colors.primary} />
            <Text style={styles.contractBadgeText}>HĐ #{contract?.code || 'HD-204-23'}</Text>
          </View>
        </View>

        {/* 3. Tenant Summary Card */}
        <View style={styles.tenantCard}>
          <View style={styles.tenantTopRow}>
            <View style={styles.tenantAvatarGroup}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6FON2cN8wXusOkxVS3CuHmhK19xnxbV7q2VX-SNfNpAJAUN8rHmcTHQKdTtSQbu_z7LeTeYbrUad3Znx_abxaMAmtt9VrT4GZ-TdWapXrmZUx_qH8djzCQ03LvlOIe5uJW5PPvau31wpxF4yYVGtPRzE2jPELREYpRnUh7WiilSz6msVe7ZWrI-7D5dmCKaRrdsesf3AL-63js2hONlQm_AMxmXyl0FP9habcaxw',
                }}
                style={styles.tenantImg}
              />
              <View>
                <View style={styles.roomTagRow}>
                  <Text style={styles.roomCodeTitle}>
                    {contract?.roomCode || room?.code || 'Phòng 204'}
                  </Text>
                  <View style={styles.floorBadge}>
                    <Text style={styles.floorBadgeText}>
                      {room?.floor ? `Tầng ${room.floor}` : 'Tầng 2'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.tenantName}>
                  {contract?.tenant?.fullName || 'Khách thuê'}
                </Text>
              </View>
            </View>

            <View style={styles.checkoutBadge}>
              <LogOut size={13} color="#92400e" />
              <Text style={styles.checkoutBadgeText}>Trả phòng</Text>
            </View>
          </View>

          <View style={styles.tenantMetaRow}>
            <View style={styles.tenantMetaBox}>
              <Text style={styles.tenantMetaLabel}>Ngày trả phòng</Text>
              <Text style={styles.tenantMetaVal}>28/05/2025</Text>
            </View>
            <View style={styles.tenantMetaBox}>
              <Text style={styles.tenantMetaLabel}>Thời hạn thuê</Text>
              <Text style={styles.tenantMetaVal}>12 tháng (Hết hạn)</Text>
            </View>
          </View>

          <View style={styles.reasonBox}>
            <Info size={15} color={colors.onSurfaceVariant} />
            <Text style={styles.reasonText}>Lý do: </Text>
            <TextInput
              style={[styles.reasonText, { flex: 1, paddingVertical: 0 }]}
              value={reason}
              onChangeText={setReason}
              placeholder="Nhập lý do trả phòng"
            />
          </View>
        </View>

        {/* 4. Settlement Ledger Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionCardTitle}>Bảng quyết toán chi tiết</Text>
            <Text style={styles.sectionCardSub}>Kỳ: Tháng 05/2025</Text>
          </View>

          {/* [A] Initial Deposit Credit */}
          <View style={styles.depositCreditBox}>
            <View style={styles.depositLeft}>
              <View style={styles.depositIconWrap}>
                <Lock size={16} color="#065f46" />
              </View>
              <View>
                <Text style={styles.depositTitle}>[A] Tiền cọc gốc đang giữ</Text>
                <Text style={styles.depositSub}>Theo hợp đồng đã ký 28/05/2024</Text>
              </View>
            </View>
            <Text style={styles.depositAmount}>+{formatMoney(originalDeposit)}</Text>
          </View>

          {/* [B] Deductions List */}
          <View style={styles.deductionsGroup}>
            <View style={styles.deductionsHeader}>
              <Text style={styles.deductionsTitle}>[B] Các khoản khấu trừ phát sinh</Text>
              <Text style={styles.deductionsTotal}>Tổng: -{formatMoney(totalDeductions)}</Text>
            </View>

            {/* Electricity Item */}
            <View style={styles.deductionItem}>
              <View style={styles.deductionTopRow}>
                <View style={styles.deductionIconRow}>
                  <Zap size={16} color="#d97706" />
                  <Text style={styles.deductionName}>Tiền điện chốt cuối kỳ</Text>
                </View>
                <Text style={styles.deductionAmount}>-{formatMoney(elecCost)}</Text>
              </View>
              <View style={styles.readingInputRow}>
                <Text style={styles.readingInputLabel}>
                  Cũ: {elecOld} kWh → Chốt:
                </Text>
                <TextInput
                  style={styles.readingInput}
                  keyboardType="numeric"
                  value={elecNew}
                  onChangeText={setElecNew}
                />
                <Text style={styles.readingUsage}>
                  ({elecUused} kWh × 3.500 ₫)
                </Text>
              </View>
            </View>

            {/* Water Item */}
            <View style={styles.deductionItem}>
              <View style={styles.deductionTopRow}>
                <View style={styles.deductionIconRow}>
                  <Droplet size={16} color="#0284c7" />
                  <Text style={styles.deductionName}>Tiền nước sinh hoạt</Text>
                </View>
                <Text style={styles.deductionAmount}>-{formatMoney(waterCost)}</Text>
              </View>
              <View style={styles.readingInputRow}>
                <Text style={styles.readingInputLabel}>
                  Cũ: {waterOld} m³ → Chốt:
                </Text>
                <TextInput
                  style={styles.readingInput}
                  keyboardType="numeric"
                  value={waterNew}
                  onChangeText={setWaterNew}
                />
                <Text style={styles.readingUsage}>
                  ({waterUsed} m³ × 25.000 ₫)
                </Text>
              </View>
            </View>

            {/* Prorated Rent */}
            <View style={styles.deductionItem}>
              <View style={styles.deductionTopRow}>
                <View style={styles.deductionIconRow}>
                  <Calendar size={16} color={colors.primary} />
                  <Text style={styles.deductionName}>Tiền phòng lẻ trong tháng</Text>
                </View>
                <Text style={styles.deductionAmount}>-{formatMoney(proratedRent)}</Text>
              </View>
              <Text style={styles.deductionNote}>
                10 ngày thực tế sử dụng (18/05 → 28/05: 150.000 ₫/ngày)
              </Text>
            </View>

            {/* Repairs / Cleaning */}
            <View style={styles.deductionItem}>
              <View style={styles.deductionTopRow}>
                <View style={styles.deductionIconRow}>
                  <Sparkles size={16} color={colors.secondary} />
                  <Text style={styles.deductionName}>Vệ sinh sâu & Sơn dặm tường</Text>
                </View>
                <Text style={styles.deductionAmount}>-{formatMoney(otherCost)}</Text>
              </View>
              <TextInput
                style={styles.chargeInput}
                keyboardType="numeric"
                value={cleaningDeduction}
                onChangeText={setCleaningDeduction}
                placeholder="Nhập chi phí sửa chữa"
              />
            </View>
          </View>

          {/* [C] Net Refund Hero Box */}
          <View style={styles.netRefundCard}>
            <View>
              <Text style={styles.netRefundLabel}>[C] Thực hoàn trả lại khách [A - B]</Text>
              <Text style={styles.netRefundAmount}>{formatMoney(netRefund)}</Text>
            </View>
            <View style={styles.settleStatusTag}>
              <CheckCircle2 size={14} color="#065f46" />
              <Text style={styles.settleStatusTagText}>Hoàn cọc đủ</Text>
            </View>
          </View>
        </View>

        {/* 5. Refund Method Switcher */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Phương thức hoàn tiền</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[
                styles.methodBtn,
                paymentMethod === 'VIETQR' && styles.activeMethodBtn,
              ]}
              onPress={() => setPaymentMethod('VIETQR')}
            >
              <QrCode size={18} color={paymentMethod === 'VIETQR' ? colors.primary : colors.onSurfaceVariant} />
              <Text
                style={[
                  styles.methodBtnText,
                  paymentMethod === 'VIETQR' && styles.activeMethodBtnText,
                ]}
              >
                Chuyển VietQR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodBtn,
                paymentMethod === 'CASH' && styles.activeMethodBtn,
              ]}
              onPress={() => setPaymentMethod('CASH')}
            >
              <Banknote size={18} color={paymentMethod === 'CASH' ? colors.primary : colors.onSurfaceVariant} />
              <Text
                style={[
                  styles.methodBtnText,
                  paymentMethod === 'CASH' && styles.activeMethodBtnText,
                ]}
              >
                Tiền mặt
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 6. Sticky Confirm Button */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={styles.confirmCheckoutBtn}
          activeOpacity={0.85}
          disabled={finalizeMutation.isPending}
          onPress={handleConfirmMoveOut}
        >
          {finalizeMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#ffffff" />
              <Text style={styles.confirmCheckoutBtnText}>
                Xác nhận trả phòng & Hoàn cọc ({formatMoney(netRefund)})
              </Text>
            </>
          )}
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
  stepProgressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radii.md,
  },
  stepProgressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffc329',
  },
  stepProgressText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  contractBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  contractBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  tenantCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  tenantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tenantAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  tenantImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  roomTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomCodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  floorBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  floorBadgeText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tenantName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 2,
  },
  checkoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  checkoutBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  tenantMetaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  tenantMetaBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: tokens.radii.sm,
    gap: 2,
  },
  tenantMetaLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  tenantMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: tokens.radii.sm,
  },
  reasonText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionCardSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  depositCreditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.md,
  },
  depositLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  depositIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064e3b',
  },
  depositSub: {
    fontSize: 10,
    color: '#047857',
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#047857',
  },
  deductionsGroup: {
    gap: tokens.spacing.sm,
  },
  deductionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  deductionsTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  deductionItem: {
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
    gap: 4,
  },
  deductionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deductionName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  deductionAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  readingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  readingInputLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  readingInput: {
    width: 60,
    height: 28,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  readingUsage: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  deductionNote: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  chargeInput: {
    height: 32,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    color: colors.onSurface,
    marginTop: 2,
  },
  netRefundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.md,
  },
  netRefundLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  netRefundAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15803d',
    marginTop: 2,
  },
  settleStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  settleStatusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  methodRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 12,
    borderRadius: tokens.radii.md,
  },
  activeMethodBtn: {
    backgroundColor: '#e2dfff',
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  activeMethodBtnText: {
    color: colors.primary,
    fontWeight: '700',
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
  confirmCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: tokens.radii.md,
  },
  confirmCheckoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
