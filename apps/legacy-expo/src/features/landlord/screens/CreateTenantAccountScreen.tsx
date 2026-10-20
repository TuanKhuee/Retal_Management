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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  UserPlus,
  User,
  Phone,
  Lock,
  Mail,
  ShieldCheck,
  DoorOpen,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  Sparkles,
  KeyRound,
  RotateCcw,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { useCreateTenantAccount, useRooms } from '../api/landlordApi';

const DEFAULT_PASSWORDS = ['Khach123@', 'ThuePhong@2025', 'NhaTro2025@', 'AnCu123@'];

export function CreateTenantAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const createAccountMutation = useCreateTenantAccount();
  const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Khach123@');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(params.roomId || '');

  // Result state
  const [createdResult, setCreatedResult] = useState<{
    fullName: string;
    phone: string;
    password: string;
    roomCode?: string;
  } | null>(null);

  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const selectedRoom = rooms.find((r) => (r._id || r.id) === selectedRoomId);

  const handleGeneratePassword = () => {
    const randomIndex = Math.floor(Math.random() * DEFAULT_PASSWORDS.length);
    setPassword(DEFAULT_PASSWORDS[randomIndex]);
  };

  const handleResetForm = () => {
    setFullName('');
    setPhone('');
    setPassword('Khach123@');
    setEmail('');
    setCccdNumber('');
    setSelectedRoomId('');
    setCreatedResult(null);
    setCopiedSuccess(false);
  };

  const handleSubmit = async () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.replace(/[\s\-\.]/g, '');

    if (!cleanName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Họ và tên người thuê.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      Alert.alert('Số điện thoại không hợp lệ', 'Vui lòng nhập số điện thoại gồm ít nhất 9-10 chữ số.');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu khởi tạo phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        fullName: cleanName,
        phone: cleanPhone,
        password,
        email: email.trim() || undefined,
        cccdNumber: cccdNumber.trim() || undefined,
        roomId: selectedRoomId || undefined,
        roomName: selectedRoom?.code,
      });

      setCreatedResult({
        fullName: cleanName,
        phone: cleanPhone,
        password,
        roomCode: selectedRoom?.code,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo tài khoản người thuê';
      Alert.alert('Lỗi tạo tài khoản', msg);
    }
  };

  const handleCopyMessage = () => {
    if (!createdResult) return;

    const message = `Chào ${createdResult.fullName},\nChủ trọ đã khởi tạo tài khoản quản lý phòng trọ cho bạn:\n- Tên đăng nhập (SĐT): ${createdResult.phone}\n- Mật khẩu: ${createdResult.password}${createdResult.roomCode ? `\n- Phòng thuê: ${createdResult.roomCode}` : ''}\n\nBạn vui lòng mở ứng dụng Quản lý nhà trọ, chọn tab "Khách thuê phòng" và đăng nhập để theo dõi phòng và hóa đơn nhé!`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } else {
      Alert.alert(
        'Thông tin tài khoản khách thuê',
        message,
        [{ text: 'Đóng' }],
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Cấp tài khoản người thuê</Text>
          <Text style={styles.headerSubtitle}>Tạo thông tin đăng nhập cho khách thuê phòng</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Success Banner / Result Card */}
        {createdResult ? (
          <View style={styles.successCard}>
            <View style={styles.successBadgeRow}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={28} color={colors.secondaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.successCardTitle}>Tạo tài khoản thành công!</Text>
                <Text style={styles.successCardSub}>
                  Khách thuê đã có thể đăng nhập ngay vào ứng dụng.
                </Text>
              </View>
            </View>

            {/* Credential Details Box */}
            <View style={styles.credentialBox}>
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Người thuê:</Text>
                <Text style={styles.credValue}>{createdResult.fullName}</Text>
              </View>
              <View style={styles.credDivider} />
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Số điện thoại (ID):</Text>
                <Text style={[styles.credValue, styles.credHighlight]}>{createdResult.phone}</Text>
              </View>
              <View style={styles.credDivider} />
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Mật khẩu:</Text>
                <Text style={[styles.credValue, styles.credHighlight]}>{createdResult.password}</Text>
              </View>
              {createdResult.roomCode && (
                <>
                  <View style={styles.credDivider} />
                  <View style={styles.credRow}>
                    <Text style={styles.credLabel}>Phòng gán:</Text>
                    <Text style={styles.credValue}>{createdResult.roomCode}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyMessage}
              activeOpacity={0.8}
            >
              <Copy size={18} color={colors.onPrimary} />
              <Text style={styles.copyButtonText}>
                {copiedSuccess ? 'Đã sao chép tin nhắn!' : 'Sao chép thông tin gửi khách (SMS / Zalo)'}
              </Text>
            </TouchableOpacity>

            <View style={styles.successActionRow}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetForm}
                activeOpacity={0.8}
              >
                <RotateCcw size={16} color={colors.primary} />
                <Text style={styles.resetButtonText}>Tạo tài khoản khác</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.replace('/dashboard')}
                activeOpacity={0.8}
              >
                <Text style={styles.homeButtonText}>Về trang chủ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Guide Card */}
            <View style={styles.guideCard}>
              <Sparkles size={20} color={colors.secondaryContainer} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: tokens.spacing.sm }}>
                <Text style={styles.guideTitle}>Chủ trọ cấp quyền truy cập</Text>
                <Text style={styles.guideDesc}>
                  Sau khi bạn tạo, người thuê mở ứng dụng, chọn tab &quot;Khách thuê phòng&quot;, nhập số điện thoại và mật khẩu bên dưới là đăng nhập được ngay.
                </Text>
              </View>
            </View>

            {/* 3. Form Card: Thông tin cơ bản */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Thông tin người thuê</Text>

              {/* Full name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Họ và tên người thuê <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color={colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: Nguyễn Văn Nam"
                    placeholderTextColor={colors.outlineVariant}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Phone number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Số điện thoại đăng nhập <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Phone size={18} color={colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 0987654321"
                    placeholderTextColor={colors.outlineVariant}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.inputHelper}>
                  Số điện thoại này sẽ dùng làm tên tài khoản để khách đăng nhập.
                </Text>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa chỉ Email (Tùy chọn)</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: nam.nguyen@email.com"
                    placeholderTextColor={colors.outlineVariant}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* CCCD */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số CCCD / CMND (Tùy chọn)</Text>
                <View style={styles.inputWrapper}>
                  <ShieldCheck size={18} color={colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 001200001234"
                    placeholderTextColor={colors.outlineVariant}
                    value={cccdNumber}
                    onChangeText={setCccdNumber}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                </View>
              </View>
            </View>

            {/* 4. Form Card: Mật khẩu khởi tạo */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>Mật khẩu khởi tạo</Text>
                <TouchableOpacity
                  onPress={handleGeneratePassword}
                  style={styles.quickGenButton}
                  activeOpacity={0.7}
                >
                  <KeyRound size={14} color={colors.secondaryContainer} />
                  <Text style={styles.quickGenText}>Đổi mật khẩu ngẫu nhiên</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập mật khẩu cho khách"
                    placeholderTextColor={colors.outlineVariant}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.outline} />
                    ) : (
                      <Eye size={18} color={colors.outline} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHelper}>
                  Khách thuê có thể đổi lại mật khẩu bất cứ lúc nào trong ứng dụng.
                </Text>
              </View>
            </View>

            {/* 5. Form Card: Gán phòng trọ (Tùy chọn) */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Gán phòng trọ (Tùy chọn)</Text>
              <Text style={styles.cardSectionSub}>
                Chọn phòng khách đang hoặc sắp chuyển vào để tự động liên kết hợp đồng.
              </Text>

              {isLoadingRooms ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.roomChipsWrap}>
                  <TouchableOpacity
                    style={[
                      styles.roomChip,
                      !selectedRoomId && styles.roomChipSelected,
                    ]}
                    onPress={() => setSelectedRoomId('')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.roomChipText,
                        !selectedRoomId && styles.roomChipTextSelected,
                      ]}
                    >
                      Chưa gán phòng
                    </Text>
                  </TouchableOpacity>

                  {rooms.map((room) => {
                    const roomId = room._id || room.id || '';
                    const isSelected = selectedRoomId === roomId;
                    return (
                      <TouchableOpacity
                        key={roomId}
                        style={[
                          styles.roomChip,
                          isSelected && styles.roomChipSelected,
                          room.status === 'OCCUPIED' && styles.roomChipOccupied,
                        ]}
                        onPress={() => setSelectedRoomId(roomId)}
                        activeOpacity={0.8}
                      >
                        <DoorOpen
                          size={14}
                          color={isSelected ? colors.onPrimary : colors.outline}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.roomChipText,
                            isSelected && styles.roomChipTextSelected,
                          ]}
                        >
                          {room.code || `Phòng ${room.roomNumber}`}
                          {room.status === 'OCCUPIED' ? ' (Đang ở)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 6. Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                createAccountMutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={createAccountMutation.isPending}
              activeOpacity={0.8}
            >
              {createAccountMutation.isPending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <UserPlus size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Tạo tài khoản khách thuê</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.base,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.outline,
    marginTop: 2,
  },
  scrollContent: {
    padding: tokens.spacing.base,
    paddingBottom: tokens.spacing['4xl'],
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(92, 225, 230, 0.08)',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(92, 225, 230, 0.25)',
    marginBottom: tokens.spacing.base,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondaryContainer,
    marginBottom: 2,
  },
  guideDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.xl,
    padding: tokens.spacing.base,
    marginBottom: tokens.spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: tokens.spacing.md,
  },
  cardSectionSub: {
    fontSize: 13,
    color: colors.outline,
    marginTop: -8,
    marginBottom: tokens.spacing.md,
  },
  quickGenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92, 225, 230, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  quickGenText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryContainer,
    marginLeft: 4,
  },
  inputGroup: {
    marginBottom: tokens.spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  requiredStar: {
    color: colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: tokens.radii.md,
    paddingHorizontal: tokens.spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  inputHelper: {
    fontSize: 11,
    color: colors.outline,
    marginTop: 4,
  },
  roomChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: tokens.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roomChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roomChipOccupied: {
    opacity: 0.7,
  },
  roomChipText: {
    fontSize: 13,
    color: colors.onSurface,
  },
  roomChipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: tokens.radii.lg,
    height: 52,
    marginTop: tokens.spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },

  // Success view styles
  successCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.xl,
    padding: tokens.spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(92, 225, 230, 0.4)',
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  successBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.base,
  },
  successIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(92, 225, 230, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  successCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  successCardSub: {
    fontSize: 13,
    color: colors.outline,
    marginTop: 2,
  },
  credentialBox: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: tokens.spacing.base,
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  credDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4,
  },
  credLabel: {
    fontSize: 13,
    color: colors.outline,
  },
  credValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  credHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondaryContainer,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: tokens.radii.md,
    height: 48,
    marginBottom: tokens.spacing.md,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  successActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: tokens.radii.md,
    height: 44,
    gap: 6,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  homeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: tokens.radii.md,
    height: 44,
  },
  homeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
});
