import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  SlidersHorizontal,
  DoorOpen,
  Phone,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  UserPlus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useRooms, RoomItem } from '../api/landlordApi';
import { LandlordBottomNav } from '../components/LandlordBottomNav';

type StatusFilter = 'ALL' | 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

export function RoomListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const { data: rooms, isLoading, refetch, isRefetching } = useRooms();

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    return rooms.filter((room) => {
      // Status filter
      if (selectedStatus !== 'ALL' && room.status !== selectedStatus) {
        return false;
      }
      // Floor filter
      if (selectedFloor !== null && room.floor !== selectedFloor) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = room.code.toLowerCase().includes(q) || (room.roomNumber && room.roomNumber.includes(q));
        const tenantMatch = room.tenant?.fullName?.toLowerCase().includes(q);
        if (!codeMatch && !tenantMatch) return false;
      }
      return true;
    });
  }, [rooms, selectedStatus, selectedFloor, searchQuery]);

  const totalRooms = rooms?.length ?? 0;
  const occupiedCount = rooms?.filter((r) => r.status === 'OCCUPIED').length ?? 0;
  const vacantCount = rooms?.filter((r) => r.status === 'VACANT').length ?? 0;
  const reservedCount = rooms?.filter((r) => r.status === 'RESERVED').length ?? 0;
  const maintenanceCount = rooms?.filter((r) => r.status === 'MAINTENANCE').length ?? 0;
  const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

  const getStatusBadge = (status: RoomItem['status']) => {
    switch (status) {
      case 'OCCUPIED':
        return {
          bg: '#e1e8fd',
          color: colors.primary,
          label: 'Đang thuê',
        };
      case 'VACANT':
        return {
          bg: '#e8f5e9',
          color: '#2e7d32',
          label: 'Phòng trống',
        };
      case 'RESERVED':
        return {
          bg: '#fff8e1',
          color: '#f57f17',
          label: 'Đã cọc',
        };
      case 'MAINTENANCE':
        return {
          bg: '#f5f5f5',
          color: '#757575',
          label: 'Bảo trì',
        };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách phòng</Text>
        <TouchableOpacity
          style={styles.headerAddBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/create-room')}
        >
          <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
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
        {/* 2. Top Utility Summary Banner */}
        <View style={styles.summaryBanner}>
          <View>
            <Text style={styles.summaryTitle}>Tổng cộng {totalRooms} phòng</Text>
            <Text style={styles.summarySubtitle}>
              {occupiedCount}/{totalRooms} phòng đang hoạt động sinh lời
            </Text>
          </View>
          <View style={styles.occupancyPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.occupancyPillText}>Tỷ lệ: {occupancyPercentage}%</Text>
          </View>
        </View>

        {/* 3. Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm số phòng (ví dụ: 101, 204), tên khách..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <X size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.filterBtn}>
              <SlidersHorizontal size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. Horizontal Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedStatus === 'ALL' && selectedFloor === null && styles.activeFilterChip,
            ]}
            onPress={() => {
              setSelectedStatus('ALL');
              setSelectedFloor(null);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === 'ALL' && selectedFloor === null && styles.activeFilterChipText,
              ]}
            >
              Tất cả ({totalRooms})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === 'VACANT' && styles.activeFilterChip]}
            onPress={() => setSelectedStatus(selectedStatus === 'VACANT' ? 'ALL' : 'VACANT')}
          >
            <View style={[styles.filterDot, { backgroundColor: '#10b981' }]} />
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === 'VACANT' && styles.activeFilterChipText,
              ]}
            >
              Trống ({vacantCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === 'OCCUPIED' && styles.activeFilterChip]}
            onPress={() => setSelectedStatus(selectedStatus === 'OCCUPIED' ? 'ALL' : 'OCCUPIED')}
          >
            <View style={[styles.filterDot, { backgroundColor: '#3b82f6' }]} />
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === 'OCCUPIED' && styles.activeFilterChipText,
              ]}
            >
              Đang thuê ({occupiedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === 'RESERVED' && styles.activeFilterChip]}
            onPress={() => setSelectedStatus(selectedStatus === 'RESERVED' ? 'ALL' : 'RESERVED')}
          >
            <View style={[styles.filterDot, { backgroundColor: '#f59e0b' }]} />
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === 'RESERVED' && styles.activeFilterChipText,
              ]}
            >
              Đã cọc ({reservedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === 'MAINTENANCE' && styles.activeFilterChip]}
            onPress={() => setSelectedStatus(selectedStatus === 'MAINTENANCE' ? 'ALL' : 'MAINTENANCE')}
          >
            <View style={[styles.filterDot, { backgroundColor: '#94a3b8' }]} />
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === 'MAINTENANCE' && styles.activeFilterChipText,
              ]}
            >
              Bảo trì ({maintenanceCount})
            </Text>
          </TouchableOpacity>

          <View style={styles.chipDivider} />

          {[1, 2, 3].map((floor) => (
            <TouchableOpacity
              key={floor}
              style={[styles.filterChip, selectedFloor === floor && styles.activeFilterChip]}
              onPress={() => setSelectedFloor(selectedFloor === floor ? null : floor)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFloor === floor && styles.activeFilterChipText,
                ]}
              >
                Tầng {floor}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 5. Room Cards Feed */}
        <View style={styles.roomFeed}>
          {filteredRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <DoorOpen size={36} color={colors.outline} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có phòng nào</Text>
              <Text style={styles.emptySubtitle}>
                Dãy trọ này hiện chưa có phòng nào. Nhấn nút bên dưới để tạo phòng mới và bắt đầu quản lý.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => router.push('/create-room')}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#ffffff" />
                <Text style={styles.emptyAddBtnText}>Tạo phòng đầu tiên</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRooms.map((room) => {
            const badge = getStatusBadge(room.status);
            const isOverdue = room.tenant?.paymentStatus === 'OVERDUE';

            return (
              <TouchableOpacity
                key={room._id || room.id}
                style={[styles.roomCard, isOverdue && styles.roomCardOverdue]}
                activeOpacity={0.85}
                onPress={() => router.push(`/room-detail?id=${room._id || room.id}`)}
              >
                {/* Top Section */}
                <View style={styles.roomCardTop}>
                  <View style={styles.roomCardTopLeft}>
                    <View style={styles.roomIconBadge}>
                      <DoorOpen size={20} color={colors.primary} />
                      <Text style={styles.roomFloorBadgeText}>Tầng {room.floor}</Text>
                    </View>
                    <View style={styles.roomInfo}>
                      <View style={styles.roomCodeRow}>
                        <Text style={styles.roomCodeText}>{room.code}</Text>
                        <Text style={styles.roomAreaText}>
                          {room.area || 28}m² • {room.feature || 'Khép kín'}
                        </Text>
                      </View>
                      <Text style={styles.roomTenantText} numberOfLines={1}>
                        Khách: <Text style={styles.tenantNameHighlight}>{room.tenant?.fullName || 'Chưa có người ở'}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                {/* Financial Middle Row */}
                <View style={styles.roomCardMiddle}>
                  <View>
                    <Text style={styles.rentLabel}>Tiền thuê</Text>
                    <Text style={styles.rentValue}>
                      {formatMoney(room.rent)}
                      <Text style={styles.rentUnit}>/tháng</Text>
                    </Text>
                  </View>

                  {/* Payment status badge */}
                  {room.status === 'OCCUPIED' && (
                    <View
                      style={[
                        styles.paymentBadge,
                        isOverdue
                          ? { backgroundColor: colors.errorContainer }
                          : { backgroundColor: '#e8f5e9' },
                      ]}
                    >
                      {isOverdue ? (
                        <>
                          <AlertCircle size={13} color={colors.error} />
                          <Text style={[styles.paymentBadgeText, { color: colors.error }]}>
                            Trễ {room.tenant?.overdueDays || 3} ngày
                          </Text>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} color="#2e7d32" />
                          <Text style={[styles.paymentBadgeText, { color: '#2e7d32' }]}>
                            Đã đóng T3/2025
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </View>

                {/* Bottom Row: Due date & Action buttons */}
                <View style={styles.roomCardBottom}>
                  <Text style={styles.dueDayText}>
                    {room.status === 'VACANT'
                      ? 'Phòng trống • Sẵn sàng đón khách'
                      : 'Hạn đóng định kỳ: Ngày 05 hàng tháng'}
                  </Text>

                  <View style={styles.cardActionsRow}>
                    {room.status === 'VACANT' ? (
                      <TouchableOpacity
                        style={styles.quickCheckinBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/checkin-wizard?roomId=${room._id || room.id}`);
                        }}
                        activeOpacity={0.8}
                      >
                        <UserPlus size={13} color="#ffffff" />
                        <Text style={styles.quickCheckinText}>Nhận phòng</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        {room.tenant?.phone && (
                          <TouchableOpacity
                            style={styles.cardActionIconBtn}
                            onPress={() => Linking.openURL(`tel:${room.tenant?.phone}`)}
                          >
                            <Phone size={15} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.cardActionIconBtn}
                          onPress={() => router.push(`/room-detail?id=${room._id || room.id}`)}
                        >
                          <FileText size={15} color={colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation */}
      <LandlordBottomNav activeTab="rooms" roomsCount={rooms?.length ?? 0} />
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
  backButton: {
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
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.md,
    paddingBottom: 80,
    gap: tokens.spacing.md,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.xs,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  summarySubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  occupancyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ffc329',
  },
  occupancyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    paddingHorizontal: tokens.spacing.md,
    height: 48,
    ...tokens.shadows.sm,
  },
  searchIcon: {
    marginRight: tokens.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterBtn: {
    padding: 4,
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    ...tokens.shadows.sm,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurface,
  },
  activeFilterChipText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  chipDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: 4,
  },
  roomFeed: {
    gap: tokens.spacing.md,
  },
  roomCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  roomCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  roomCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomCardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  roomIconBadge: {
    width: 44,
    height: 44,
    borderRadius: tokens.radii.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomFloorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
  roomInfo: {
    flex: 1,
  },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  roomAreaText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  roomTenantText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  tenantNameHighlight: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  roomCardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  rentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  rentUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roomCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  dueDayText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  cardActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: tokens.radii.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCheckinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...tokens.shadows.sm,
  },
  quickCheckinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.md,
  },
  emptyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    marginTop: tokens.spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: tokens.spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.md,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radii.full,
    ...tokens.shadows.sm,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
