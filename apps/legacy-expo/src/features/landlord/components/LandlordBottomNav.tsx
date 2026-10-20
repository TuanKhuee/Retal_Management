import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Grid, DoorOpen, Plus, LogOut } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { useAuthStore } from '../../../store/authStore';

export type LandlordTab = 'dashboard' | 'rooms' | 'create-room' | 'profile';

interface LandlordBottomNavProps {
  activeTab: LandlordTab;
  roomsCount?: number;
}

export function LandlordBottomNav({ activeTab, roomsCount }: LandlordBottomNavProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleTabPress = (tab: LandlordTab) => {
    if (tab === activeTab) return;
    switch (tab) {
      case 'dashboard':
        router.replace('/dashboard');
        break;
      case 'rooms':
        router.replace('/rooms');
        break;
      case 'create-room':
        router.push('/create-room');
        break;
      case 'profile':
        // Prompt or logout
        break;
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      {/* Tab 1: Dashboard */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => handleTabPress('dashboard')}
      >
        <View style={[styles.iconWrapper, activeTab === 'dashboard' && styles.activeIconWrapper]}>
          <Grid
            size={20}
            color={activeTab === 'dashboard' ? colors.primary : colors.outline}
          />
        </View>
        <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.activeTabLabel]}>
          Tổng quan
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Rooms */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => handleTabPress('rooms')}
      >
        <View style={[styles.iconWrapper, activeTab === 'rooms' && styles.activeIconWrapper]}>
          <DoorOpen
            size={20}
            color={activeTab === 'rooms' ? colors.primary : colors.outline}
          />
          {roomsCount !== undefined && roomsCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{roomsCount > 99 ? '99+' : roomsCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'rooms' && styles.activeTabLabel]}>
          Phòng trọ
        </Text>
      </TouchableOpacity>

      {/* Center Action: Create Room */}
      <TouchableOpacity
        style={styles.centerFabItem}
        activeOpacity={0.85}
        onPress={() => handleTabPress('create-room')}
      >
        <View style={styles.centerFabCircle}>
          <Plus size={22} color="#ffffff" />
        </View>
        <Text style={styles.centerFabLabel}>Thêm phòng</Text>
      </TouchableOpacity>

      {/* Tab 4: Account / Logout */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={handleLogout}
      >
        <View style={styles.iconWrapper}>
          <LogOut size={20} color={colors.outline} />
        </View>
        <Text style={styles.tabLabel}>
          Đăng xuất
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: Platform.OS === 'ios' ? 76 : 64,
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    ...tokens.shadows.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeIconWrapper: {
    backgroundColor: colors.surfaceContainer,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.outline,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  centerFabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  centerFabCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.md,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  centerFabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
});
