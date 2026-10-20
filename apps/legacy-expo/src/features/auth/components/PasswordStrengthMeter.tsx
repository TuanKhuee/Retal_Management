import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { PasswordCriteria } from '../hooks/usePasswordStrength';

interface PasswordStrengthMeterProps {
  score: number; // 0..3
  criteria?: PasswordCriteria;
  showCriteriaList?: boolean;
  hintText?: string;
}

export function PasswordStrengthMeter({
  score,
  criteria,
  showCriteriaList = false,
  hintText = 'Gợi ý: Kết hợp chữ hoa, số và ký tự đặc biệt.',
}: PasswordStrengthMeterProps) {
  const getBarColor = (index: number) => {
    if (score === 0) return colors.surfaceContainerHighest;
    if (index >= score) return colors.surfaceContainerHighest;

    if (score === 1) return colors.error;
    if (score === 2) return colors.secondaryContainer;
    return colors.status.vacant;
  };

  return (
    <View style={styles.container}>
      {/* 3 segment bars */}
      <View style={styles.barsRow}>
        <View style={[styles.bar, { backgroundColor: getBarColor(0) }]} />
        <View style={[styles.bar, { backgroundColor: getBarColor(1) }]} />
        <View style={[styles.bar, { backgroundColor: getBarColor(2) }]} />
      </View>

      {!showCriteriaList && hintText && (
        <Text style={styles.hintText}>{hintText}</Text>
      )}

      {showCriteriaList && criteria && (
        <View style={styles.criteriaContainer}>
          <Text style={styles.criteriaTitle}>Tiêu chuẩn bảo mật:</Text>

          <View style={styles.criteriaItem}>
            {criteria.hasMinLength ? (
              <CheckCircle2 size={16} color={colors.secondaryContainer} fill={colors.secondaryContainer} />
            ) : (
              <Circle size={16} color={colors.outline} />
            )}
            <Text
              style={[
                styles.criteriaLabel,
                criteria.hasMinLength && styles.criteriaLabelMet,
              ]}
            >
              Tối thiểu 8 ký tự
            </Text>
          </View>

          <View style={styles.criteriaItem}>
            {criteria.hasNumber ? (
              <CheckCircle2 size={16} color={colors.secondaryContainer} fill={colors.secondaryContainer} />
            ) : (
              <Circle size={16} color={colors.outline} />
            )}
            <Text
              style={[
                styles.criteriaLabel,
                criteria.hasNumber && styles.criteriaLabelMet,
              ]}
            >
              Chứa ít nhất 1 chữ số
            </Text>
          </View>

          <View style={styles.criteriaItem}>
            {criteria.hasSpecial ? (
              <CheckCircle2 size={16} color={colors.secondaryContainer} fill={colors.secondaryContainer} />
            ) : (
              <Circle size={16} color={colors.outline} />
            )}
            <Text
              style={[
                styles.criteriaLabel,
                criteria.hasSpecial && styles.criteriaLabelMet,
              ]}
            >
              Chứa ký tự đặc biệt (!@#$%^&*)
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    gap: 6,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 6,
    height: 6,
    width: '100%',
  },
  bar: {
    flex: 1,
    height: '100%',
    borderRadius: tokens.radii.full,
  },
  hintText: {
    ...tokens.typography.caption,
    color: colors.outline,
    marginTop: 2,
  },
  criteriaContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.DEFAULT,
    padding: tokens.spacing.md,
    gap: 8,
    marginTop: 6,
  },
  criteriaTitle: {
    ...tokens.typography.caption,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 2,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criteriaLabel: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
  },
  criteriaLabelMet: {
    color: colors.onSurface,
    fontWeight: '500',
  },
});
