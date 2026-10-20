import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Layers,
  DoorOpen,
  CheckSquare,
  Square,
  Plus,
  Building,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useBulkCreateRooms, useCreateRoom, useProperties } from '../api/landlordApi';

type Mode = 'BULK' | 'SINGLE';

export function CreateRoomScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('BULK');

  const { data: properties } = useProperties();
  const activeProperty = properties?.[0];
  const propertyId = activeProperty?._id || activeProperty?.id || '6ac908c8f56e1d8016a8da21';

  // Bulk generator state
  const [prefix, setPrefix] = useState('P.');
  const [roomsPerFloor, setRoomsPerFloor] = useState(8);
  const [selectedFloors, setSelectedFloors] = useState<number[]>([1, 2]);
  const [bulkRent, setBulkRent] = useState('3500000');
  const [bulkDeposit, setBulkDeposit] = useState('3500000');
  const [bulkArea, setBulkArea] = useState('25');

  // Single room state
  const [singleCode, setSingleCode] = useState('P.301');
  const [singleFloor, setSingleFloor] = useState('3');
  const [singleRent, setSingleRent] = useState('3800000');
  const [singleDeposit, setSingleDeposit] = useState('3800000');
  const [singleArea, setSingleArea] = useState('28');

  // Amenities
  const [amenities, setAmenities] = useState<string[]>([
    'Máy lạnh',
    'Bình nóng lạnh',
    'Gác lửng',
  ]);

  const allAmenities = [
    'Máy lạnh',
    'Bình nóng lạnh',
    'Gác lửng',
    'Tủ lạnh',
    'Tủ quần áo',
    'Ban công',
    'Cửa sổ thoáng',
    'Kệ bếp',
  ];

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const toggleFloor = (floor: number) => {
    setSelectedFloors((prev) =>
      prev.includes(floor) ? prev.filter((f) => f !== floor) : [...prev, floor].sort()
    );
  };

  // Generated room codes for preview
  const previewRoomCodes = useMemo(() => {
    const list: string[] = [];
    selectedFloors.forEach((fl) => {
      for (let i = 1; i <= roomsPerFloor; i++) {
        const padded = String(i).padStart(2, '0');
        list.push(`${prefix}${fl}${padded}`);
      }
    });
    return list;
  }, [prefix, roomsPerFloor, selectedFloors]);

  const bulkCreateMutation = useBulkCreateRooms();
  const createRoomMutation = useCreateRoom();

  const isSubmitting = bulkCreateMutation.isPending || createRoomMutation.isPending;

  const handleSubmit = async () => {
    if (!propertyId) {
      Alert.alert('Thông báo', 'Đang tải thông tin dãy trọ, vui lòng thử lại sau giây lát!');
      return;
    }

    if (mode === 'BULK') {
      if (selectedFloors.length === 0) {
        Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 tầng cần tạo phòng!');
        return;
      }
      try {
        const cleanPrefix = prefix.replace(/[^A-Za-z0-9]/g, '') || 'P';
        for (const fl of selectedFloors) {
          const pattern = `${cleanPrefix}${fl}01-${cleanPrefix}${fl}${String(roomsPerFloor).padStart(2, '0')}`;
          await bulkCreateMutation.mutateAsync({
            propertyId,
            pattern,
            floor: fl,
            area: Number(bulkArea) || 25,
            baseRent: Number(bulkRent) || 3500000,
          });
        }
        Alert.alert('Thành công', `Đã tạo tự động ${previewRoomCodes.length} phòng mới!`, [
          { text: 'Đến danh sách phòng', onPress: () => router.replace('/rooms') },
        ]);
      } catch (err: any) {
        Alert.alert('Thông báo', err?.message || 'Có lỗi xảy ra khi tạo phòng hàng loạt!');
      }
    } else {
      if (!singleCode.trim()) {
        Alert.alert('Thông báo', 'Vui lòng nhập mã phòng!');
        return;
      }
      try {
        await createRoomMutation.mutateAsync({
          propertyId,
          code: singleCode.trim(),
          floor: Number(singleFloor) || 1,
          area: Number(singleArea) || 25,
          baseRent: Number(singleRent) || 3500000,
        });
        Alert.alert('Thành công', `Phòng ${singleCode.trim()} đã được tạo thành công!`, [
          { text: 'Đến danh sách phòng', onPress: () => router.replace('/rooms') },
        ]);
      } catch (err: any) {
        Alert.alert('Thông báo', err?.message || 'Có lỗi xảy ra khi tạo phòng mới!');
      }
    }
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
        <Text style={styles.headerTitle}>Tạo phòng mới</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Hero Delight Banner */}
        <View style={styles.delightBanner}>
          <View style={styles.delightIconBadge}>
            <Sparkles size={20} color={colors.secondary} />
          </View>
          <View style={styles.delightTextContent}>
            <View style={styles.delightBadgeRow}>
              <Text style={styles.delightTitle}>Khởi tạo dãy trọ thần tốc</Text>
              <View style={styles.tag85}>
                <Text style={styles.tag85Text}>Tiết kiệm 85% giờ</Text>
              </View>
            </View>
            <Text style={styles.delightSubtitle}>
              Tạo tự động hàng loạt danh sách phòng kèm tiện ích chuẩn chỉ trong 30 giây.
            </Text>
          </View>
        </View>

        {/* Active Property Badge */}
        <View style={styles.propertyInfoBar}>
          <Building size={15} color={colors.primary} />
          <Text style={styles.propertyInfoText}>
            Dãy trọ gán phòng: <Text style={styles.propertyInfoHighlight}>{activeProperty?.name || 'Dãy trọ MOONLIGHT'}</Text>
          </Text>
        </View>

        {/* 3. Segmented Switcher */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'BULK' && styles.activeModeTab]}
            onPress={() => setMode('BULK')}
          >
            <Layers size={16} color={mode === 'BULK' ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.modeTabText, mode === 'BULK' && styles.activeModeTabText]}>
              Tạo hàng loạt (Bulk)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'SINGLE' && styles.activeModeTab]}
            onPress={() => setMode('SINGLE')}
          >
            <DoorOpen size={16} color={mode === 'SINGLE' ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.modeTabText, mode === 'SINGLE' && styles.activeModeTabText]}>
              Tạo từng phòng lẻ
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. BULK FORM */}
        {mode === 'BULK' ? (
          <View style={styles.formSection}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Quy tắc sinh mã phòng</Text>

              {/* Prefix & Rooms Per Floor */}
              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Tiền tố phòng</Text>
                  <TextInput
                    style={styles.textInput}
                    value={prefix}
                    onChangeText={setPrefix}
                    placeholder="Ví dụ: P. hoặc A-"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Số phòng / Tầng</Text>
                  <View style={styles.numberStepperRow}>
                    {[4, 6, 8, 10].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.numStepBtn,
                          roomsPerFloor === num && styles.activeNumStepBtn,
                        ]}
                        onPress={() => setRoomsPerFloor(num)}
                      >
                        <Text
                          style={[
                            styles.numStepBtnText,
                            roomsPerFloor === num && styles.activeNumStepBtnText,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Floor Checkboxes */}
              <View style={styles.floorsGroup}>
                <View style={styles.floorsHeader}>
                  <Text style={styles.inputLabel}>Các tầng cần tạo</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedFloors([1, 2, 3, 4])}
                  >
                    <Text style={styles.selectAllText}>Chọn tất cả (1-4)</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.floorsGrid}>
                  {[1, 2, 3, 4].map((fl) => {
                    const isSelected = selectedFloors.includes(fl);
                    return (
                      <TouchableOpacity
                        key={fl}
                        style={[styles.floorChip, isSelected && styles.activeFloorChip]}
                        onPress={() => toggleFloor(fl)}
                      >
                        <Text
                          style={[
                            styles.floorChipTitle,
                            isSelected && styles.activeFloorChipTitle,
                          ]}
                        >
                          Tầng {fl}
                        </Text>
                        <Text
                          style={[
                            styles.floorChipSub,
                            isSelected && styles.activeFloorChipSub,
                          ]}
                        >
                          {fl}01 - {fl}{String(roomsPerFloor).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Live Preview Chips */}
              <View style={styles.previewBox}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Xem trước danh sách</Text>
                  <View style={styles.previewCountBadge}>
                    <Text style={styles.previewCountBadgeText}>
                      Tổng: {previewRoomCodes.length} phòng
                    </Text>
                  </View>
                </View>
                <View style={styles.previewChipsFlow}>
                  {previewRoomCodes.slice(0, 12).map((code) => (
                    <View key={code} style={styles.previewChip}>
                      <Text style={styles.previewChipText}>{code}</Text>
                    </View>
                  ))}
                  {previewRoomCodes.length > 12 && (
                    <View style={styles.previewChipMore}>
                      <Text style={styles.previewChipMoreText}>
                        +{previewRoomCodes.length - 12} phòng nữa
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Default Economics */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Giá thuê & Diện tích mặc định</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Giá thuê (VND/tháng)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={bulkRent}
                    onChangeText={setBulkRent}
                  />
                  <Text style={styles.previewMoney}>{formatMoney(bulkRent)}</Text>
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Tiền cọc (VND)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={bulkDeposit}
                    onChangeText={setBulkDeposit}
                  />
                  <Text style={styles.previewMoney}>{formatMoney(bulkDeposit)}</Text>
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.inputLabel}>Diện tích (m²)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={bulkArea}
                  onChangeText={setBulkArea}
                  placeholder="Ví dụ: 25"
                />
              </View>
            </View>
          </View>
        ) : (
          /* SINGLE ROOM FORM */
          <View style={styles.formSection}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Thông tin phòng lẻ</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Mã phòng</Text>
                  <TextInput
                    style={styles.textInput}
                    value={singleCode}
                    onChangeText={setSingleCode}
                    placeholder="P.301"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Thuộc tầng</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={singleFloor}
                    onChangeText={setSingleFloor}
                    placeholder="3"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Giá thuê (VND)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={singleRent}
                    onChangeText={setSingleRent}
                  />
                  <Text style={styles.previewMoney}>{formatMoney(singleRent)}</Text>
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Tiền cọc (VND)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={singleDeposit}
                    onChangeText={setSingleDeposit}
                  />
                  <Text style={styles.previewMoney}>{formatMoney(singleDeposit)}</Text>
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.inputLabel}>Diện tích (m²)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={singleArea}
                  onChangeText={setSingleArea}
                  placeholder="28"
                />
              </View>
            </View>
          </View>
        )}

        {/* 5. Amenities Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Tiện ích phòng kèm theo</Text>
          <View style={styles.amenitiesGrid}>
            {allAmenities.map((amenity) => {
              const checked = amenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  style={[styles.amenityChip, checked && styles.activeAmenityChip]}
                  onPress={() => toggleAmenity(amenity)}
                >
                  {checked ? (
                    <CheckSquare size={15} color={colors.primary} />
                  ) : (
                    <Square size={15} color={colors.outline} />
                  )}
                  <Text
                    style={[
                      styles.amenityText,
                      checked && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {amenity}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 6. Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Plus size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {mode === 'BULK'
                  ? `Khởi tạo ${previewRoomCodes.length} phòng ngay`
                  : `Tạo phòng ${singleCode} ngay`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.md,
    paddingBottom: 40,
    gap: tokens.spacing.md,
  },
  delightBanner: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
  },
  delightIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffc329',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delightTextContent: {
    flex: 1,
    gap: 4,
  },
  delightBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  delightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tag85: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tag85Text: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  delightSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: tokens.radii.md,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: tokens.radii.sm,
  },
  activeModeTab: {
    backgroundColor: '#ffffff',
    ...tokens.shadows.sm,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  activeModeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  formSection: {
    gap: tokens.spacing.md,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  inputRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  inputCol: {
    flex: 1,
    gap: 4,
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
    fontWeight: '600',
  },
  previewMoney: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  numberStepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  numStepBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNumStepBtn: {
    backgroundColor: colors.primary,
  },
  numStepBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  activeNumStepBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  floorsGroup: {
    gap: 6,
    marginTop: 4,
  },
  floorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  floorsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  floorChip: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 8,
    borderRadius: tokens.radii.md,
    alignItems: 'center',
    gap: 2,
  },
  activeFloorChip: {
    backgroundColor: colors.primary,
  },
  floorChipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  activeFloorChipTitle: {
    color: '#ffffff',
  },
  floorChipSub: {
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  activeFloorChipSub: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  previewBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.sm,
    gap: 8,
    marginTop: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  previewCountBadge: {
    backgroundColor: '#ffdf9f',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  previewCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
  },
  previewChipsFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  previewChipMore: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  previewChipMoreText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: tokens.radii.sm,
  },
  activeAmenityChip: {
    backgroundColor: '#e2dfff',
  },
  amenityText: {
    fontSize: 12,
    color: colors.onSurface,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: tokens.radii.md,
    marginTop: 8,
    ...tokens.shadows.md,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  propertyInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 10,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  propertyInfoText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  propertyInfoHighlight: {
    fontWeight: '700',
    color: colors.onSurface,
  },
});
