import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';

interface HeaderBarProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  showAvatar?: boolean;
}

export function HeaderBar({
  title,
  onBack,
  showBack = true,
  showAvatar = true,
}: HeaderBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={colors.onSurface} />
          </TouchableOpacity>
        )}
        <Image
          source={require('../../../../assets/images/icon.png')}
          style={styles.logoIcon}
          resizeMode="contain"
        />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {showAvatar && (
        <View style={styles.avatarCircle} accessibilityLabel="Tài khoản">
          <User size={16} color={colors.onPrimary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: tokens.spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: tokens.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: tokens.radii.sm,
  },
  title: {
    ...tokens.typography.titleSm,
    color: colors.onSurface,
    fontWeight: '600',
    flexShrink: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: tokens.radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
