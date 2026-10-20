import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

interface OtpInputGroupProps {
  value: string;
  onChange: (otp: string) => void;
  length?: number;
}

export function OtpInputGroup({ value, onChange, length = 6 }: OtpInputGroupProps) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  const handleChangeText = (text: string, index: number) => {
    // If user pastes multiple digits
    if (text.length > 1) {
      const sanitized = text.replace(/\D/g, '').slice(0, length);
      onChange(sanitized);
      const nextIndex = Math.min(sanitized.length, length - 1);
      inputs.current[nextIndex]?.focus();
      return;
    }

    const sanitizedChar = text.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = sanitizedChar;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    if (sanitizedChar && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, idx) => (
        <TextInput
          key={idx}
          ref={(ref) => {
            inputs.current[idx] = ref;
          }}
          style={[styles.box, digit ? styles.boxFilled : null]}
          value={digit}
          onChangeText={(text) => handleChangeText(text, idx)}
          onKeyPress={(e) => handleKeyPress(e, idx)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          accessibilityLabel={`Chữ số OTP ${idx + 1}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginVertical: tokens.spacing.md,
  },
  box: {
    flex: 1,
    height: 52,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.lg,
    textAlign: 'center',
    ...tokens.typography.titleSm,
    color: colors.primary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  boxFilled: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.primaryContainer,
  },
});
