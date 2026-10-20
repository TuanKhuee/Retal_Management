import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export type BadgeType = 'room' | 'invoice' | 'maintenance' | 'priority';

interface StatusBadgeProps {
  type: BadgeType;
  status: string;
}

interface BadgeConfig {
  label: string;
  color: string;
  bg: string;
  iconSymbol: string;
}

const BADGE_MAP: Record<string, BadgeConfig> = {
  // Rooms
  VACANT: { label: 'Còn trống', color: colors.status.vacant, bg: colors.status.vacantBg, iconSymbol: '●' },
  OCCUPIED: { label: 'Đang thuê', color: colors.status.occupied, bg: colors.status.occupiedBg, iconSymbol: '●' },
  MAINTENANCE: { label: 'Bảo trì', color: colors.status.maintenance, bg: colors.status.maintenanceBg, iconSymbol: '▲' },
  RESERVED: { label: 'Đã cọc', color: colors.status.reserved, bg: colors.status.reservedBg, iconSymbol: '★' },

  // Invoices
  PAID: { label: 'Đã thanh toán', color: colors.status.paid, bg: colors.status.paidBg, iconSymbol: '✓' },
  PARTIALLY_PAID: { label: 'Thu một phần', color: colors.status.partiallyPaid, bg: colors.status.partiallyPaidBg, iconSymbol: '◐' },
  ISSUED: { label: 'Chờ thanh toán', color: colors.status.issued, bg: colors.status.issuedBg, iconSymbol: '○' },
  OVERDUE: { label: 'Quá hạn', color: colors.status.overdue, bg: colors.status.overdueBg, iconSymbol: '!' },
  CANCELLED: { label: 'Đã hủy', color: colors.outline, bg: colors.surfaceContainer, iconSymbol: '✕' },
  DRAFT: { label: 'Bản nháp', color: colors.tertiary, bg: colors.surfaceContainerHigh, iconSymbol: '✎' },

  // Maintenance
  NEW: { label: 'Mới gửi', color: colors.status.issued, bg: colors.status.issuedBg, iconSymbol: '★' },
  ACCEPTED: { label: 'Đã tiếp nhận', color: colors.primary, bg: colors.surfaceContainerHigh, iconSymbol: '▶' },
  IN_PROGRESS: { label: 'Đang sửa chữa', color: colors.status.maintenance, bg: colors.status.maintenanceBg, iconSymbol: '⚙' },
  RESOLVED: { label: 'Đã xử lý xong', color: colors.status.vacant, bg: colors.status.vacantBg, iconSymbol: '✓' },
  CONFIRMED: { label: 'Đã nghiệm thu', color: colors.status.paid, bg: colors.status.paidBg, iconSymbol: '✔' },
  REJECTED: { label: 'Từ chối', color: colors.status.overdue, bg: colors.status.overdueBg, iconSymbol: '✕' },

  // Priority
  LOW: { label: 'Thấp', color: colors.tertiary, bg: colors.surfaceContainer, iconSymbol: '↓' },
  NORMAL: { label: 'Bình thường', color: colors.status.issued, bg: colors.status.issuedBg, iconSymbol: '→' },
  HIGH: { label: 'Ưu tiên', color: colors.status.maintenance, bg: colors.status.maintenanceBg, iconSymbol: '↑' },
  URGENT: { label: 'Khẩn cấp', color: colors.status.overdue, bg: colors.status.overdueBg, iconSymbol: '⚠' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toUpperCase();
  const config = BADGE_MAP[normalized] || {
    label: status,
    color: colors.onSurfaceVariant,
    bg: colors.surfaceContainer,
    iconSymbol: '•',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color + '40' }]}>
      <Text style={[styles.icon, { color: config.color }]}>{config.iconSymbol}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  icon: {
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
