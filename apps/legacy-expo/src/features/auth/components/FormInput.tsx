import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

export interface FormInputProps extends TextInputProps {
  label?: string;
  labelRight?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  helperText?: string;
  errorText?: string;
  containerStyle?: ViewStyle;
  isLocked?: boolean;
}

export function FormInput({
  label,
  labelRight,
  leftIcon,
  rightElement,
  helperText,
  errorText,
  containerStyle,
  isLocked = false,
  style,
  ...inputProps
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {(label || labelRight) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {labelRight && <View style={styles.labelRight}>{labelRight}</View>}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          isLocked && styles.inputLocked,
          isFocused && !isLocked && styles.inputFocused,
          !!errorText && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            rightElement ? styles.inputWithRight : null,
            isLocked ? styles.textLocked : null,
            style,
          ]}
          placeholderTextColor={colors.outline}
          editable={!isLocked && inputProps.editable !== false}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />

        {rightElement && (
          <View style={styles.rightElementContainer}>{rightElement}</View>
        )}
      </View>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: tokens.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    ...tokens.typography.bodySmMedium,
    color: colors.onSurface,
  },
  labelRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.DEFAULT,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  inputFocused: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.primaryContainer,
  },
  inputLocked: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.surfaceContainerHighest,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorContainer,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: tokens.spacing.base,
    ...tokens.typography.bodyBase,
    color: colors.onSurface,
  },
  inputWithLeft: {
    paddingLeft: 42,
  },
  inputWithRight: {
    paddingRight: 44,
  },
  textLocked: {
    color: colors.onSurfaceVariant,
  },
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightElementContainer: {
    position: 'absolute',
    right: 4,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperText: {
    ...tokens.typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    paddingLeft: 2,
  },
  errorText: {
    ...tokens.typography.caption,
    color: colors.error,
    marginTop: 4,
    paddingLeft: 2,
  },
});
