import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Compass, SlidersHorizontal, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

interface PrototypeInspectorProps {
  onToggleError?: () => void;
  onSimulateSuccess?: () => void;
  actions?: { label: string; onPress: () => void; icon?: React.ReactNode }[];
}

export function PrototypeInspector({
  onToggleError,
  onSimulateSuccess,
  actions,
}: PrototypeInspectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Compass size={14} color={colors.secondary} />
          <Text style={styles.title}>PROTOTYPE FLOW INSPECTOR</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>v2.4 Ready</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Nhấn các nút để xem kiểm thử tương tác:
      </Text>

      <View style={styles.buttonRow}>
        {onToggleError && (
          <TouchableOpacity
            style={[styles.pillButton, styles.errorPill]}
            onPress={onToggleError}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={13} color={colors.error} />
            <Text style={[styles.pillText, { color: colors.error }]}>
              Bật/Tắt Lỗi
            </Text>
          </TouchableOpacity>
        )}

        {onSimulateSuccess && (
          <TouchableOpacity
            style={[styles.pillButton, styles.successPill]}
            onPress={onSimulateSuccess}
            activeOpacity={0.7}
          >
            <CheckCircle2 size={13} color={colors.primary} />
            <Text style={[styles.pillText, { color: colors.primary }]}>
              Giả lập Đăng nhập đúng
            </Text>
          </TouchableOpacity>
        )}

        {actions?.map((act, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.pillButton, styles.customPill]}
            onPress={act.onPress}
            activeOpacity={0.7}
          >
            {act.icon}
            <Text style={[styles.pillText, { color: colors.onSurface }]}>
              {act.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.xl,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...tokens.typography.caption,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.full,
  },
  badgeText: {
    ...tokens.typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  description: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    ...tokens.shadows.sm,
  },
  errorPill: {},
  successPill: {},
  customPill: {},
  pillText: {
    ...tokens.typography.caption,
    fontWeight: '600',
  },
});
