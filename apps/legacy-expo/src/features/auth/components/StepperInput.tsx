import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

interface StepperInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export function StepperInput({
  value,
  onChange,
  min = 1,
  max = 999,
  unit = 'phòng',
}: StepperInputProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, value <= min && styles.buttonDisabled]}
        onPress={handleDecrement}
        disabled={value <= min}
        activeOpacity={0.7}
        accessibilityLabel="Giảm số lượng"
        accessibilityRole="button"
      >
        <Minus size={18} color={value <= min ? colors.outline : colors.onSurface} />
      </TouchableOpacity>

      <View style={styles.valueContainer}>
        <Text style={styles.valueText}>{value}</Text>
        {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.button, value >= max && styles.buttonDisabled]}
        onPress={handleIncrement}
        disabled={value >= max}
        activeOpacity={0.7}
        accessibilityLabel="Tăng số lượng"
        accessibilityRole="button"
      >
        <Plus size={18} color={value >= max ? colors.outline : colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: tokens.radii.DEFAULT,
    padding: 4,
    gap: 8,
    ...tokens.shadows.sm,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: tokens.radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    minWidth: 50,
    justifyContent: 'center',
  },
  valueText: {
    ...tokens.typography.tabularAmount,
    color: colors.onSurface,
  },
  unitText: {
    ...tokens.typography.caption,
    color: colors.outline,
  },
});
