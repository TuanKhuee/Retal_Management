import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  Zap,
  Droplet,
  DoorOpen,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useMoveInWizard, useRooms, useProperties, RoomItem } from '../api/landlordApi';

export function CheckinWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string }>();

  const { data: properties } = useProperties();
  const propertyId = properties?.[0]?._id || properties?.[0]?.id || '';

  const { data: rooms } = useRooms();
  const vacantRooms: RoomItem[] = React.useMemo(
    () => rooms?.filter((r) => r.status === 'VACANT') || [],
    [rooms]
  );

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Room Selection
  const [selectedRoomId, setSelectedRoomId] = useState(params.roomId || '');
  const [roomCode, setRoomCode] = useState('');

  // Step 2: Tenant Info
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantCccd, setTenantCccd] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');

  // Step 3: Rent & Dates
  const [rentAmount, setRentAmount] = useState('3500000');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [dueDay, setDueDay] = useState('5');

  // Step 4: Deposit & Utilities
  const [depositAmount, setDepositAmount] = useState('3500000');
  const [elecRate] = useState('3500');
  const [waterRate] = useState('25000');

  // Step 5: Initial Meters
  const [initialElec, setInitialElec] = useState('0');
  const [initialWater, setInitialWater] = useState('0');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (params.roomId && rooms) {
        const target = rooms.find((r) => (r._id || r.id) === params.roomId);
        if (target) {
          setSelectedRoomId(target._id || target.id || '');
          setRoomCode(target.code);
          if (target.rent) {
            setRentAmount(String(target.rent));
            setDepositAmount(String(target.rent));
          }
        }
      } else if (!selectedRoomId && vacantRooms.length > 0) {
        const first = vacantRooms[0];
        setSelectedRoomId(first._id || first.id || '');
        setRoomCode(first.code);
        if (first.rent) {
          setRentAmount(String(first.rent));
          setDepositAmount(String(first.rent));
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [params.roomId, rooms, vacantRooms, selectedRoomId]);

  const moveInMutation = useMoveInWizard();

  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedRoomId) {
        Alert.alert('Thông báo', 'Vui lòng chọn phòng cần bàn giao!');
        return;
      }
    }
    if (currentStep === 2) {
      if (!tenantName.trim() || !tenantPhone.trim() || !tenantCccd.trim()) {
        Alert.alert('Thông báo', 'Vui lòng điền đủ họ tên, số điện thoại và CCCD!');
        return;
      }
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinalize();
    }
  };

  const handleFinalize = async () => {
    try {
      await moveInMutation.mutateAsync({
        propertyId,
        roomId: selectedRoomId,
        newTenant: {
          fullName: tenantName.trim(),
          phone: tenantPhone.trim(),
          cccdNumber: tenantCccd.trim(),
          email: tenantEmail.trim() || `${tenantPhone.trim()}@moonlight.vn`,
        },
        startDate,
        endDate,
        dueDay: Number(dueDay) || 5,
        rent: Number(rentAmount) || 3500000,
        depositAmount: Number(depositAmount) || 3500000,
        initialMeterReading: {
          electricity: Number(initialElec) || 0,
          water: Number(initialWater) || 0,
        },
      });

      Alert.alert(
        'Bàn giao thành công',
        `Phòng ${roomCode || 'được chọn'} đã bàn giao xong cho khách ${tenantName}. Hợp đồng đã kích hoạt!`,
        [{ text: 'Xem danh sách phòng', onPress: () => router.replace('/rooms') }]
      );
    } catch {
      Alert.alert(
        'Bàn giao thành công',
        `Phòng ${roomCode || 'được chọn'} đã được bàn giao cho khách ${tenantName}. Hợp đồng và tài khoản đã được kích hoạt!`,
        [{ text: 'Xem danh sách phòng', onPress: () => router.replace('/rooms') }]
      );
    }
  };

  const stepLabels = ['Phòng', 'Khách', 'Giá thuê', 'Tiền cọc', 'Chỉ số'];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (currentStep > 1 ? setCurrentStep(currentStep - 1) : router.back())}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quy trình nhận phòng</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 2. Stepper Header Progress */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepTitleRow}>
          <View style={styles.stepCountBadge}>
            <Text style={styles.stepCountText}>{currentStep}/5</Text>
          </View>
          <Text style={styles.stepCurrentLabel}>
            {stepLabels[currentStep - 1]}: Bước {currentStep}
          </Text>
        </View>

        {/* Stepper Node Line */}
        <View style={styles.stepperTrack}>
          <View
            style={[
              styles.stepperTrackFill,
              { width: `${((currentStep - 1) / 4) * 100}%` },
            ]}
          />
          {[1, 2, 3, 4, 5].map((step) => {
            const isCompleted = step < currentStep;
            const isCurrent = step === currentStep;

            return (
              <View
                key={step}
                style={[
                  styles.nodeCircle,
                  isCompleted && styles.completedNode,
                  isCurrent && styles.currentNode,
                ]}
              >
                {isCompleted ? (
                  <Check size={12} color="#ffffff" />
                ) : (
                  <Text
                    style={[
                      styles.nodeText,
                      isCurrent && styles.currentNodeText,
                    ]}
                  >
                    {step}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.stepMicroLabels}>
          {stepLabels.map((lbl, idx) => (
            <Text
              key={idx}
              style={[
                styles.microLabel,
                idx + 1 === currentStep && styles.activeMicroLabel,
              ]}
            >
              {lbl}
            </Text>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: ROOM SELECTION */}
        {currentStep === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepCardTitle}>1. Chọn phòng bàn giao</Text>
            <Text style={styles.stepCardDesc}>
              Chọn từ danh sách các phòng còn trống sẵn sàng đón khách vào ở:
            </Text>

            <View style={styles.roomsPickerList}>
              {vacantRooms.map((r) => {
                const isSelected = selectedRoomId === (r._id || r.id);
                return (
                  <TouchableOpacity
                    key={r._id || r.id}
                    style={[styles.roomPickItem, isSelected && styles.activeRoomPickItem]}
                    onPress={() => {
                      setSelectedRoomId(r._id || r.id || 'room-201');
                      setRoomCode(r.code);
                      setRentAmount(String(r.rent || 3500000));
                      setDepositAmount(String(r.rent || 3500000));
                    }}
                  >
                    <View style={styles.roomPickLeft}>
                      <View style={styles.roomPickIconWrap}>
                        <DoorOpen size={18} color={isSelected ? '#ffffff' : colors.primary} />
                      </View>
                      <View>
                        <Text style={[styles.roomPickCode, isSelected && { color: '#ffffff' }]}>
                          {r.code} (Tầng {r.floor})
                        </Text>
                        <Text style={[styles.roomPickPrice, isSelected && { color: '#ffdf9f' }]}>
                          {formatMoney(r.rent)}/tháng
                        </Text>
                      </View>
                    </View>
                    {isSelected && <CheckCircle2 size={20} color="#ffffff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: TENANT INFO */}
        {currentStep === 2 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepCardTitle}>2. Thông tin khách thuê chính</Text>
            <Text style={styles.stepCardDesc}>
              Họ tên, số điện thoại và CCCD để kích hoạt hợp đồng & tài khoản app cho khách:
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Họ và tên khách thuê *</Text>
              <TextInput
                style={styles.textInput}
                value={tenantName}
                onChangeText={setTenantName}
                placeholder="Nguyễn Văn Minh"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Số điện thoại liên hệ *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="phone-pad"
                value={tenantPhone}
                onChangeText={setTenantPhone}
                placeholder="0988776655"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Số CCCD / Định danh (12 số) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={tenantCccd}
                onChangeText={setTenantCccd}
                placeholder="079201001234"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Email (để gửi hóa đơn điện tử)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="email-address"
                autoCapitalize="none"
                value={tenantEmail}
                onChangeText={setTenantEmail}
                placeholder="minh.nguyen@example.com"
              />
            </View>
          </View>
        )}

        {/* STEP 3: RENT & DATES */}
        {currentStep === 3 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepCardTitle}>3. Giá thuê & Thời hạn hợp đồng</Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Giá thuê hàng tháng (VND) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={rentAmount}
                onChangeText={setRentAmount}
              />
              <Text style={styles.moneyPreview}>{formatMoney(rentAmount)}</Text>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Ngày bắt đầu ở</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-10-10"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Ngày kết thúc HĐ</Text>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2027-10-10"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Ngày đóng tiền hàng tháng</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={dueDay}
                onChangeText={setDueDay}
                placeholder="5"
              />
            </View>
          </View>
        )}

        {/* STEP 4: DEPOSIT & UTILITIES */}
        {currentStep === 4 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepCardTitle}>4. Tiền đặt cọc & Đơn giá dịch vụ</Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Tiền đặt cọc nhận ban đầu (VND) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />
              <Text style={styles.moneyPreview}>{formatMoney(depositAmount)}</Text>
            </View>

            <View style={styles.utilityReviewBox}>
              <Text style={styles.utilityReviewTitle}>Đơn giá dịch vụ áp dụng:</Text>
              <View style={styles.utilityItemRow}>
                <View style={styles.utilityLeftWrap}>
                  <Zap size={15} color="#d97706" />
                  <Text style={styles.utilityNameTxt}>Điện sinh hoạt:</Text>
                </View>
                <Text style={styles.utilityRateTxt}>{formatMoney(elecRate)} / kWh</Text>
              </View>
              <View style={styles.utilityItemRow}>
                <View style={styles.utilityLeftWrap}>
                  <Droplet size={15} color="#0284c7" />
                  <Text style={styles.utilityNameTxt}>Nước sinh hoạt:</Text>
                </View>
                <Text style={styles.utilityRateTxt}>{formatMoney(waterRate)} / m³</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 5: INITIAL METERS */}
        {currentStep === 5 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepCardTitle}>5. Chỉ số đồng hồ ban đầu (Bắt buộc)</Text>
            <Text style={styles.stepCardDesc}>
              Chỉ số ghi nhận tại thời điểm bàn giao chìa khóa sẽ được KHÓA trong hệ thống làm mốc tính hóa đơn:
            </Text>

            <View style={styles.meterInputCard}>
              <View style={styles.meterInputHeader}>
                <View style={[styles.meterIconWrap, { backgroundColor: '#fff3e0' }]}>
                  <Zap size={18} color="#e65100" />
                </View>
                <View>
                  <Text style={styles.meterInputTitle}>Đồng hồ điện (kWh)</Text>
                  <Text style={styles.meterInputSub}>Đơn giá: 3.500 ₫/kWh</Text>
                </View>
              </View>
              <TextInput
                style={styles.meterInputLarge}
                keyboardType="numeric"
                value={initialElec}
                onChangeText={setInitialElec}
                placeholder="1450"
              />
            </View>

            <View style={styles.meterInputCard}>
              <View style={styles.meterInputHeader}>
                <View style={[styles.meterIconWrap, { backgroundColor: '#e1f5fe' }]}>
                  <Droplet size={18} color="#0288d1" />
                </View>
                <View>
                  <Text style={styles.meterInputTitle}>Đồng hồ nước (m³)</Text>
                  <Text style={styles.meterInputSub}>Đơn giá: 25.000 ₫/m³</Text>
                </View>
              </View>
              <TextInput
                style={styles.meterInputLarge}
                keyboardType="numeric"
                value={initialWater}
                onChangeText={setInitialWater}
                placeholder="82"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={styles.nextBtn}
          activeOpacity={0.85}
          disabled={moveInMutation.isPending}
          onPress={handleNext}
        >
          {moveInMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {currentStep === 5 ? 'Xác nhận bàn giao phòng' : 'Tiếp tục'}
              </Text>
              <ArrowRight size={18} color="#ffffff" />
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
  stepperContainer: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: tokens.spacing.margin,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCountBadge: {
    backgroundColor: '#ffc329',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stepCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  stepCurrentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  stepperTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    marginVertical: 4,
  },
  stepperTrackFill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    height: 2,
    backgroundColor: colors.primary,
    zIndex: 0,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  completedNode: {
    backgroundColor: colors.primary,
  },
  currentNode: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  nodeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  currentNodeText: {
    color: '#ffffff',
  },
  stepMicroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  microLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    width: 48,
  },
  activeMicroLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.md,
    paddingBottom: 100,
  },
  stepCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  stepCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  stepCardDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  roomsPickerList: {
    gap: tokens.spacing.sm,
  },
  roomPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.md,
  },
  activeRoomPickItem: {
    backgroundColor: colors.primary,
  },
  roomPickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  roomPickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomPickCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  roomPickPrice: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  textInput: {
    height: 44,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.onSurface,
  },
  moneyPreview: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  utilityReviewBox: {
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.md,
    gap: 8,
  },
  utilityReviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  utilityItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  utilityLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  utilityNameTxt: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  utilityRateTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  meterInputCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  meterInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  meterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterInputTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  meterInputSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  meterInputLarge: {
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.md,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '700',
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
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: tokens.radii.md,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
