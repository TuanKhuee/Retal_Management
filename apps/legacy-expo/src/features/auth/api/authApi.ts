import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { useAuthStore, UserProfile } from '../../../store/authStore';

export interface LoginParams {
  identifier: string;
  password: string;
  deviceId?: string;
  requestedOrgId?: string;
}

export interface RegisterParams {
  email: string;
  phone?: string;
  password: string;
  fullName: string;
  organizationName: string;
  deviceId?: string;
}

export interface ForgotPasswordParams {
  identifier: string;
}

export interface ResetPasswordParams {
  token: string;
  newPassword: string;
}

export interface AcceptInviteParams {
  token: string;
  password: string;
  fullName?: string;
}

interface RawAuthResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  user?: UserProfile;
  organization?: {
    _id?: string;
    name?: string;
  };
  message?: string;
}

/**
 * Mutation: Login with email/phone + password
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setAuthData = useAuthStore((s) => s.setAuthData);

  return useMutation({
    mutationFn: async ({ identifier, password, deviceId, requestedOrgId }: LoginParams) => {
      const res = await api.auth.login(
        { identifier, password, deviceId },
        requestedOrgId,
      );
      const rawData = res.data as RawAuthResponse;

      const accessToken = rawData.accessToken || rawData.tokens?.accessToken || '';
      const refreshToken = rawData.refreshToken || rawData.tokens?.refreshToken || '';
      const user = (rawData.user || rawData) as UserProfile;
      const orgId = user.organizationId || rawData.organization?._id || '';

      if (accessToken) {
        await setAuthData(user, { accessToken, refreshToken }, orgId);
      }

      return { user, tokens: { accessToken, refreshToken }, message: res.message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/**
 * Mutation: Register new Owner + Organization
 */
export function useRegisterMutation() {
  const queryClient = useQueryClient();
  const setAuthData = useAuthStore((s) => s.setAuthData);

  return useMutation({
    mutationFn: async (params: RegisterParams) => {
      const res = await api.auth.register(params);
      const rawData = res.data as RawAuthResponse;

      const accessToken = rawData.accessToken || rawData.tokens?.accessToken || '';
      const refreshToken = rawData.refreshToken || rawData.tokens?.refreshToken || '';
      const user = (rawData.user || rawData) as UserProfile;
      const orgId = user.organizationId || rawData.organization?._id || '';

      if (accessToken) {
        await setAuthData(user, { accessToken, refreshToken }, orgId);
      }

      return { user, tokens: { accessToken, refreshToken }, message: res.message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export interface VerifyOtpParams {
  identifier: string;
  otp: string;
}

/**
 * Mutation: Request password reset / OTP via SMS
 */
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (params: ForgotPasswordParams) => {
      const res = await api.auth.forgotPassword(params);
      return res.data as { message: string; resetToken?: string; otp?: string; phone?: string };
    },
  });
}

/**
 * Mutation: Verify OTP code before setting new password
 */
export function useVerifyOtpMutation() {
  return useMutation({
    mutationFn: async (params: VerifyOtpParams) => {
      const res = await api.auth.verifyOtp(params);
      return res.data as { valid: boolean; message: string };
    },
  });
}

/**
 * Mutation: Reset password using verification token/OTP
 */
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (params: ResetPasswordParams) => {
      const res = await api.auth.resetPassword(params);
      return res.data as { message: string };
    },
  });
}

/**
 * Mutation: Accept room invitation & activate tenant account
 */
export function useAcceptInviteMutation() {
  const queryClient = useQueryClient();
  const setAuthData = useAuthStore((s) => s.setAuthData);

  return useMutation({
    mutationFn: async (params: AcceptInviteParams) => {
      const res = await api.auth.acceptInvite(params);
      const rawData = res.data as RawAuthResponse;

      const accessToken = rawData.accessToken || rawData.tokens?.accessToken || '';
      const refreshToken = rawData.refreshToken || rawData.tokens?.refreshToken || '';
      const user = (rawData.user || rawData) as UserProfile;
      const orgId = user.organizationId || '';

      if (accessToken) {
        await setAuthData(user, { accessToken, refreshToken }, orgId);
      }

      return { user, tokens: { accessToken, refreshToken }, message: res.message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/**
 * Query: Fetch invitation info for SetPassword screen
 */
export function useInvitationQuery(token: string = 'inv-tok-999') {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const res = await api.auth.getInvitation(token);
      return res.data;
    },
    enabled: Boolean(token),
  });
}

/**
 * Query: Fetch current user profile (/me)
 */
export function useProfileQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.auth.getProfile();
      return res.data as UserProfile;
    },
    enabled: isAuthenticated,
  });
}

/**
 * Query: Fetch Landlord dashboard metrics
 */
export function useLandlordDashboardQuery(propertyId: string = 'prop-001') {
  const role = useAuthStore((s) => s.role);
  return useQuery({
    queryKey: ['dashboard', propertyId],
    queryFn: async () => {
      const res = await api.properties.getDashboard(propertyId);
      return res.data;
    },
    enabled: role === 'OWNER',
  });
}

/**
 * Query: Fetch Tenant workspace preview
 */
export function useTenantWorkspaceQuery() {
  const role = useAuthStore((s) => s.role);
  return useQuery({
    queryKey: ['tenant-workspace'],
    queryFn: async () => {
      const res = await api.tenant.getWorkspace();
      return res.data;
    },
    enabled: role === 'TENANT',
  });
}

/**
 * Hook: Check and toggle Mock Mode
 */
export function useMockMode() {
  const isMockMode = useAuthStore((s) => s.isMockMode);
  const toggleMockMode = useAuthStore((s) => s.toggleMockMode);

  return {
    isMockMode,
    toggleMockMode,
  };
}
