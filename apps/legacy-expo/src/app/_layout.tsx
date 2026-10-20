import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import '../i18n';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initAuth().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.onSurface,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'MoonLight',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="introduction"
            options={{
              title: 'Giới thiệu',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              title: 'Đăng nhập',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="register"
            options={{
              title: 'Đăng ký',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="otp-verification"
            options={{
              title: 'Quên mật khẩu',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{
              title: 'Quên mật khẩu',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="verify-otp"
            options={{
              title: 'Xác thực OTP',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="reset-password"
            options={{
              title: 'Đặt lại mật khẩu',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="set-password"
            options={{
              title: 'Kích hoạt phòng',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="profile-setup"
            options={{
              title: 'Phân luồng vai trò',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="dashboard"
            options={{
              title: 'Tổng quan quản trị',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="rooms"
            options={{
              title: 'Danh sách phòng',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="room-detail"
            options={{
              title: 'Chi tiết phòng',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="create-room"
            options={{
              title: 'Tạo phòng mới',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="contract-detail"
            options={{
              title: 'Chi tiết hợp đồng',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="tenant-detail"
            options={{
              title: 'Hồ sơ khách thuê',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="checkout-settlement"
            options={{
              title: 'Thủ tục trả phòng',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="checkin-wizard"
            options={{
              title: 'Quy trình nhận phòng',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="create-tenant"
            options={{
              title: 'Cấp tài khoản người thuê',
              headerShown: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
