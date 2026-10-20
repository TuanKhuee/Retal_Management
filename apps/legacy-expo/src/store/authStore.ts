import { create } from 'zustand';
import { api } from '../api/client';

export interface UserProfile {
  id?: string;
  userId?: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'OWNER' | 'MANAGER' | 'TENANT';
  organizationId?: string;
  organizationName?: string;
  memberships?: {
    organizationId: string;
    organizationName?: string;
    role: 'OWNER' | 'MANAGER' | 'TENANT';
    propertyIds?: string[];
    tenantId?: string;
    permissions?: string[];
  }[];
}

interface AuthState {
  user: UserProfile | null;
  role: 'OWNER' | 'MANAGER' | 'TENANT' | null;
  organizationId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isMockMode: boolean;

  init: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<boolean>;
  setAuthData: (
    user: UserProfile,
    tokens: { accessToken: string; refreshToken?: string },
    orgId?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setOrganization: (orgId: string) => void;
  setRole: (role: 'OWNER' | 'MANAGER' | 'TENANT') => void;
  toggleMockMode: (enabled?: boolean) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  organizationId: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isMockMode: false,

  init: async () => {
    try {
      const mockActive = api.isMockMode();
      const token = await api.getAccessToken();
      const orgId = await api.getOrgId();

      if (!token) {
        set({ isAuthenticated: false, isLoading: false, user: null, isMockMode: mockActive });
        return;
      }

      // Fetch profile from /me
      const res = await api.auth.getProfile();
      const user = res.data as UserProfile;
      set({
        user,
        role: user.role,
        organizationId: orgId || user.organizationId || null,
        isAuthenticated: true,
        isLoading: false,
        isMockMode: mockActive,
      });
    } catch {
      await api.clearTokens();
      set({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        role: null,
        isMockMode: api.isMockMode(),
      });
    }
  },

  setAuthData: async (user, tokens, orgId) => {
    const targetOrgId = orgId || user.organizationId || '';
    await api.setTokens(tokens.accessToken, tokens.refreshToken, targetOrgId);
    set({
      user,
      role: user.role,
      organizationId: targetOrgId || null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },

  login: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.login({ identifier, password });
      const rawData = res.data as Record<string, unknown>;

      const tokens = {
        accessToken: (rawData.accessToken || (rawData.tokens as Record<string, string>)?.accessToken || '') as string,
        refreshToken: (rawData.refreshToken || (rawData.tokens as Record<string, string>)?.refreshToken || '') as string,
      };

      const user = (rawData.user || rawData) as UserProfile;
      const orgId = user.organizationId || (rawData.organization as { _id?: string })?._id || '';

      await api.setTokens(tokens.accessToken, tokens.refreshToken, orgId);

      set({
        user,
        role: user.role,
        organizationId: orgId || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout().catch(() => {});
    } finally {
      await api.clearTokens();
      set({
        user: null,
        role: null,
        organizationId: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setOrganization: (orgId: string) => {
    set({ organizationId: orgId });
  },

  setRole: (role: 'OWNER' | 'MANAGER' | 'TENANT') => {
    set({ role });
  },

  toggleMockMode: async (enabled) => {
    const nextState = enabled !== undefined ? enabled : !get().isMockMode;
    await api.setMockEnabled(nextState);
    set({ isMockMode: nextState });
    return nextState;
  },
}));
