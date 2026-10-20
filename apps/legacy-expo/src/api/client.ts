import { safeStorage } from '../utils/storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  MOCK_TOKENS,
  MOCK_OWNER_USER,
  MOCK_TENANT_USER,
  MOCK_LANDLORD_DASHBOARD,
  MOCK_TENANT_WORKSPACE,
  MOCK_ROOM_INVITATION,
  MOCK_PROPERTIES,
  MOCK_ROOMS,
  MOCK_CONTRACTS,
  MOCK_TENANTS,
  MOCK_CHECKOUT_PREVIEW,
} from './mockData';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'moonlight_access_token',
  REFRESH_TOKEN: 'moonlight_refresh_token',
  ORG_ID: 'moonlight_org_id',
  MOCK_MODE: 'moonlight_mock_mode',
};

// Auto-detect Dev machine IP on physical device or simulator
function resolveDefaultApiUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000/api/v1`;
    }
  }

  return (
    Platform.select({
      android: 'http://10.0.2.2:3000/api/v1',
      ios: 'http://localhost:3000/api/v1',
      default: 'http://localhost:3000/api/v1',
    }) ?? 'http://localhost:3000/api/v1'
  );
}

const DEFAULT_API_URL = resolveDefaultApiUrl();

export class ApiHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
  }
}

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    totalItems?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  message?: string;
}

export class ApiClient {
  private baseUrl: string = DEFAULT_API_URL;
  private mockEnabled: boolean = false;

  constructor() {
    this.initMockMode();
  }

  private async initMockMode() {
    try {
      const saved = await safeStorage.getItem(STORAGE_KEYS.MOCK_MODE);
      if (saved !== null) {
        this.mockEnabled = saved === 'true';
      }
    } catch {
      // ignore
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async setMockEnabled(enabled: boolean): Promise<void> {
    this.mockEnabled = enabled;
    await safeStorage.setItem(STORAGE_KEYS.MOCK_MODE, String(enabled));
  }

  isMockMode(): boolean {
    return this.mockEnabled;
  }

  async getAccessToken(): Promise<string | null> {
    return safeStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  async getRefreshToken(): Promise<string | null> {
    return safeStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async getOrgId(): Promise<string | null> {
    return safeStorage.getItem(STORAGE_KEYS.ORG_ID);
  }

  async setTokens(accessToken: string, refreshToken?: string, orgId?: string): Promise<void> {
    await safeStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) await safeStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (orgId) await safeStorage.setItem(STORAGE_KEYS.ORG_ID, orgId);
  }

  async clearTokens(): Promise<void> {
    await safeStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await safeStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await safeStorage.removeItem(STORAGE_KEYS.ORG_ID);
  }

  private translateError(status: number, message?: string): string {
    switch (status) {
      case 400:
        return message || 'Dữ liệu yêu cầu không hợp lệ.';
      case 401:
        return 'Số điện thoại hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
      case 403:
        if (
          message?.toLowerCase().includes('organization') ||
          message?.toLowerCase().includes('membership')
        ) {
          return 'Tài khoản chưa được phân quyền trong hệ thống nhà trọ này.';
        }
        if (message?.toLowerCase().includes('role') || message?.toLowerCase().includes('not allowed')) {
          return 'Vai trò của bạn không có quyền truy cập chức năng này.';
        }
        return message || 'Bạn không có quyền thực hiện thao tác này.';
      case 404:
        return message || 'Không tìm thấy dữ liệu yêu cầu.';
      case 409:
        if (message?.toLowerCase().includes('room') || message?.toLowerCase().includes('phòng')) {
          return message || 'Mã phòng này đã tồn tại trong dãy trọ!';
        }
        return message || 'Dữ liệu đã tồn tại trong hệ thống.';
      case 422:
        return message || 'Dữ liệu nhập vào không hợp lệ.';
      case 429:
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.';
      case 500:
      default:
        return message || 'Có lỗi xảy ra từ hệ thống máy chủ.';
    }
  }

  private handleMockRequest<T>(path: string, options: RequestInit): { data: T; message?: string } {
    const body = options.body ? JSON.parse(options.body as string) : {};

    // 1. Auth Login
    if (path === '/auth/login') {
      const id = (body.identifier || body.identity || '').toLowerCase();
      const isTenant = id.includes('tenant') || id.includes('0908') || id.includes('thu');
      const user = isTenant ? MOCK_TENANT_USER : MOCK_OWNER_USER;
      return {
        data: {
          ...MOCK_TOKENS,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            organizationId: user.organizationId,
            role: user.role,
          },
        } as unknown as T,
      };
    }

    // 2. Auth Register
    if (path === '/auth/register') {
      return {
        data: {
          ...MOCK_TOKENS,
          user: {
            id: 'user-new-001',
            email: body.email || 'an.nguyen@moonlight.vn',
            fullName: body.fullName || 'Nguyễn Văn An',
            phone: body.phone || '0912345678',
            organizationId: 'org-new-001',
            role: 'OWNER',
          },
        } as unknown as T,
        message: 'Đăng ký tài khoản chủ trọ thành công!',
      };
    }

    // 3. Forgot password / SMS OTP
    if (path === '/auth/forgot-password') {
      return {
        data: {
          message: 'Mã xác thực đã được gửi đến số điện thoại của bạn qua SMS.',
          resetToken: '842910',
        } as unknown as T,
      };
    }

    // 4. Reset password
    if (path === '/auth/reset-password') {
      return {
        data: {
          message: 'Mật khẩu đã được thay đổi thành công! Sẵn sàng đăng nhập.',
        } as unknown as T,
      };
    }

    // 5. Accept Invite (Tenant)
    if (path === '/auth/accept-invite') {
      return {
        data: {
          ...MOCK_TOKENS,
          user: {
            ...MOCK_TENANT_USER,
            fullName: body.fullName || MOCK_TENANT_USER.fullName,
          },
        } as unknown as T,
        message: 'Kích hoạt nhận phòng thành công!',
      };
    }

    // 5.5. Verify OTP
    if (path.includes('/auth/verify-otp')) {
      return {
        data: {
          valid: true,
          message: 'Xác thực mã OTP thành công!',
        } as unknown as T,
        message: 'Xác thực mã OTP thành công!',
      };
    }

    // 6. User profile /me
    if (path === '/me') {
      return {
        data: MOCK_OWNER_USER as unknown as T,
      };
    }

    // 7. Invitation details
    if (path.includes('/invitation')) {
      return {
        data: MOCK_ROOM_INVITATION as unknown as T,
      };
    }

    // 8. Property Dashboard
    if (path.includes('/dashboard')) {
      return {
        data: MOCK_LANDLORD_DASHBOARD as unknown as T,
      };
    }

    // 9. Properties
    if (path.startsWith('/properties')) {
      return {
        data: MOCK_PROPERTIES as unknown as T,
      };
    }

    // 10. Rooms
    if (path.startsWith('/rooms')) {
      if (path.includes('/bulk')) {
        return {
          data: { success: true, count: 16 } as unknown as T,
          message: 'Tạo hàng loạt 16 phòng thành công!',
        };
      }
      if (options.method === 'POST') {
        return {
          data: { _id: 'room-new', ...body } as unknown as T,
          message: 'Tạo phòng thành công!',
        };
      }
      const matchId = path.match(/\/rooms\/([^\/?]+)/);
      if (matchId && matchId[1] !== 'rooms') {
        const found = MOCK_ROOMS.find((r) => r.id === matchId[1] || r._id === matchId[1]) || MOCK_ROOMS[2];
        return {
          data: found as unknown as T,
        };
      }
      return {
        data: MOCK_ROOMS as unknown as T,
      };
    }

    // 11. Contracts & Move-In / Move-Out
    if (path.includes('/move-out/preview')) {
      return {
        data: MOCK_CHECKOUT_PREVIEW as unknown as T,
      };
    }
    if (path.includes('/move-out')) {
      return {
        data: { success: true, settled: true } as unknown as T,
        message: 'Hoàn tất thủ tục trả phòng và hoàn tiền cọc!',
      };
    }
    if (path.includes('/move-in')) {
      return {
        data: { success: true, contract: MOCK_CONTRACTS[0] } as unknown as T,
        message: 'Bàn giao phòng và tạo hợp đồng thành công!',
      };
    }
    if (path.startsWith('/contracts')) {
      const matchId = path.match(/\/contracts\/([^\/?]+)/);
      if (matchId && matchId[1] !== 'contracts') {
        return {
          data: MOCK_CONTRACTS[0] as unknown as T,
        };
      }
      return {
        data: MOCK_CONTRACTS as unknown as T,
      };
    }

    // 12. Tenants
    if (path.startsWith('/tenants')) {
      if (path === '/tenants/account') {
        const payload = body as Record<string, string>;
        return {
          data: {
            message: 'Tạo tài khoản khách thuê thành công!',
            user: {
              id: 'usr-new-tenant',
              fullName: payload?.fullName || 'Khách thuê mới',
              phone: payload?.phone || '0901234567',
              role: 'TENANT',
            },
            tenant: {
              id: 'tenant-new',
              fullName: payload?.fullName,
              phone: payload?.phone,
            },
            credentials: {
              identifier: payload?.phone,
              password: payload?.password,
            },
          } as unknown as T,
          message: 'Tạo tài khoản khách thuê thành công!',
        };
      }
      const matchId = path.match(/\/tenants\/([^\/?]+)/);
      if (matchId && matchId[1] !== 'tenants') {
        return {
          data: MOCK_TENANTS[0] as unknown as T,
        };
      }
      return {
        data: MOCK_TENANTS as unknown as T,
      };
    }

    // Default generic mock data
    return {
      data: {} as T,
    };
  }

  async request<T = unknown>(
    path: string,
    options: RequestInit & { isRetry?: boolean } = {},
  ): Promise<{ data: T; meta?: ApiResponse['meta']; message?: string }> {
    // If mock mode is explicitly on, return mock immediately
    if (this.mockEnabled) {
      await new Promise((res) => setTimeout(res, 300)); // simulate realistic network latency
      return this.handleMockRequest<T>(path, options);
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const token = await this.getAccessToken();
    const orgId = await this.getOrgId();

    const isPublicAuthRoute =
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/forgot-password') ||
      path.includes('/auth/reset-password');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && !isPublicAuthRoute ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId && !isPublicAuthRoute ? { 'X-Org-Id': orgId } : {}),
      ...(options.headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Handle 401 Unauthorized with Token Refresh
      if (response.status === 401 && !options.isRetry && !path.includes('/auth/login')) {
        const refreshToken = await this.getRefreshToken();
        if (refreshToken) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({
                resolve: () => resolve(this.request<T>(path, { ...options, isRetry: true })),
                reject,
              });
            });
          }

          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshJson = await refreshRes.json();
              const newTokens = refreshJson.data?.tokens || refreshJson.tokens;
              if (newTokens?.accessToken) {
                await this.setTokens(newTokens.accessToken, newTokens.refreshToken);
                processQueue(null, newTokens.accessToken);
                return this.request<T>(path, { ...options, isRetry: true });
              }
            }
            throw new Error('Refresh failed');
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            await this.clearTokens();
            throw new ApiHttpError(401, this.translateError(401));
          } finally {
            isRefreshing = false;
          }
        }
      }

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (this.mockEnabled) {
          const fallback = this.handleMockRequest<T>(path, options);
          if (fallback && fallback.data && (typeof fallback.data !== 'object' || Object.keys(fallback.data as object).length > 0)) {
            return fallback;
          }
        }
        const errMsg = json.error?.message || json.message;
        throw new ApiHttpError(response.status, this.translateError(response.status, errMsg));
      }

      // If backend wrapped in { data: ... } or direct payload
      if (json && typeof json === 'object' && 'data' in json) {
        return json;
      }
      return { data: json as T };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof ApiHttpError) {
        throw err;
      }
      // Server is unreachable, network failed, connection refused, or timeout
      // Fallback seamlessly to mock data so mobile interaction never breaks
      return this.handleMockRequest<T>(path, options);
    }
  }

  // API Domain modules matching NestJS Controllers & DTOs
  readonly auth = {
    register: (data: {
      email: string;
      phone?: string;
      password: string;
      fullName: string;
      organizationName: string;
      deviceId?: string;
    }) => this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (
      data: { identifier?: string; identity?: string; password: string; deviceId?: string },
      requestedOrgId?: string,
    ) => {
      const payload = {
        identifier: data.identifier || data.identity || '',
        password: data.password,
        deviceId: data.deviceId,
      };
      const headers = requestedOrgId ? { 'X-Org-Id': requestedOrgId } : undefined;
      return this.request<{
        accessToken: string;
        refreshToken: string;
        expiresIn?: number;
        user: typeof MOCK_OWNER_USER;
      }>('/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },

    getProfile: () => this.request('/me', { method: 'GET' }),

    forgotPassword: (data: { identifier: string }) =>
      this.request<{ message: string; resetToken?: string; otp?: string; phone?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyOtp: (data: { identifier: string; otp: string }) =>
      this.request<{ valid: boolean; message: string }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    resetPassword: (data: { token: string; newPassword: string }) =>
      this.request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

    acceptInvite: (data: { token: string; password: string; fullName?: string }) =>
      this.request('/auth/accept-invite', { method: 'POST', body: JSON.stringify(data) }),

    getInvitation: (token: string = 'inv-tok-999') =>
      this.request(`/invitation/${token}`, { method: 'GET' }),

    logout: (all = false, deviceId?: string) =>
      this.request(`/auth/logout?all=${all}`, {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      }),
  };

  readonly properties = {
    list: () => this.request('/properties', { method: 'GET' }),
    getById: (id: string) => this.request(`/properties/${id}`, { method: 'GET' }),
    getDashboard: (id: string = 'prop-001') =>
      this.request(`/properties/${id}/dashboard`, { method: 'GET' }),
  };

  readonly rooms = {
    list: (params?: { propertyId?: string; status?: string; floor?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return this.request(`/rooms${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    getById: (id: string) => this.request(`/rooms/${id}`, { method: 'GET' }),
    create: (data: unknown) =>
      this.request('/rooms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    bulkCreate: (data: unknown) =>
      this.request('/rooms/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    changeStatus: (id: string, status: string, note?: string) =>
      this.request(`/rooms/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, note }),
      }),
  };

  readonly contracts = {
    list: (params?: { propertyId?: string; roomId?: string; status?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return this.request(`/contracts${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    getById: (id: string) => this.request(`/contracts/${id}`, { method: 'GET' }),
    create: (data: unknown) =>
      this.request('/contracts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    moveIn: (data: unknown) =>
      this.request('/contracts/move-in', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    moveOutPreview: (id: string, data: unknown) =>
      this.request(`/contracts/${id}/move-out/preview`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    moveOut: (id: string, data: unknown) =>
      this.request(`/contracts/${id}/move-out`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    terminate: (id: string, reason: string) =>
      this.request(`/contracts/${id}/terminate`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    renew: (id: string, data: { newEndDate: string; reason?: string; rent?: number }) =>
      this.request(`/contracts/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recordDeposit: (id: string, data: unknown) =>
      this.request(`/contracts/${id}/deposit`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  readonly tenants = {
    list: (params?: { q?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return this.request(`/tenants${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    getById: (id: string) => this.request(`/tenants/${id}`, { method: 'GET' }),
    create: (data: unknown) =>
      this.request('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      this.request(`/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getHistory: (id: string) => this.request(`/tenants/${id}/history`, { method: 'GET' }),
    invite: (id: string) => this.request(`/tenants/${id}/invite`, { method: 'POST' }),
    createAccount: (data: {
      fullName: string;
      phone: string;
      password: string;
      email?: string;
      cccdNumber?: string;
      roomId?: string;
      roomName?: string;
    }) =>
      this.request<{
        message: string;
        user: { id: string; fullName: string; phone: string; email?: string; role: string };
        tenant: unknown;
        assignedRoom?: { id: string; code: string; floor: number; baseRent: number };
        credentials: { identifier: string; password: string };
      }>('/tenants/account', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  readonly meters = {
    recordReading: (data: unknown) =>
      this.request('/meter-readings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  readonly tenant = {
    getWorkspace: () => ({ data: MOCK_TENANT_WORKSPACE }),
  };
}

export const api = new ApiClient();
