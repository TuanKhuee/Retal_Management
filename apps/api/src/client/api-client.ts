/**
 * Rental Management Platform - Typed TypeScript API Client SDK
 * Auto-generated & typed client for frontend and external integrations
 */

export interface ApiClientOptions {
  baseUrl?: string;
  accessToken?: string;
  organizationId?: string;
  onUnauthorized?: () => void;
}

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    nextCursor?: string | null;
    prevCursor?: string | null;
    timestamp?: string;
    requestId?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

export class RentalApiClient {
  private baseUrl: string;
  private accessToken?: string;
  private organizationId?: string;
  private onUnauthorized?: () => void;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'http://localhost:3000/api/v1').replace(/\/$/, '');
    this.accessToken = options.accessToken;
    this.organizationId = options.organizationId;
    this.onUnauthorized = options.onUnauthorized;
  }

  public setAccessToken(token?: string) {
    this.accessToken = token;
  }

  public setOrganizationId(orgId?: string) {
    this.organizationId = orgId;
  }

  private async request<T = any>(
    path: string,
    options: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.organizationId) {
      headers['X-Org-Id'] = this.organizationId;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.onUnauthorized) {
      this.onUnauthorized();
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = json.error || {
        code: `HTTP_${response.status}`,
        message: response.statusText,
      };
      throw new Error(`[${error.code}] ${error.message}`);
    }

    return json as ApiResponse<T>;
  }

  // ===================== AUTH & PROFILE =====================
  public readonly auth = {
    register: (data: { email: string; phone: string; password: string; fullName: string; organizationName: string }) =>
      this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (data: { identity: string; password: string }, orgId?: string) =>
      this.request('/auth/login', {
        method: 'POST',
        headers: orgId ? { 'X-Org-Id': orgId } : {},
        body: JSON.stringify(data),
      }),

    refresh: (refreshToken: string) =>
      this.request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

    logout: (all = false, deviceId?: string) =>
      this.request(`/auth/logout?all=${all}`, { method: 'POST', body: JSON.stringify({ deviceId }) }),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      this.request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

    getProfile: () => this.request('/auth/me', { method: 'GET' }),
  };

  // ===================== PROPERTIES =====================
  public readonly properties = {
    list: (params?: { page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/properties${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getById: (id: string) => this.request(`/properties/${id}`, { method: 'GET' }),

    create: (data: any) => this.request('/properties', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: any) =>
      this.request(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    deactivate: (id: string) => this.request(`/properties/${id}/deactivate`, { method: 'POST' }),

    getDashboard: (id: string) => this.request(`/properties/${id}/dashboard`, { method: 'GET' }),
  };

  // ===================== ROOMS =====================
  public readonly rooms = {
    list: (params?: { propertyId?: string; status?: string; floor?: number; q?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/rooms${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getById: (id: string) => this.request(`/rooms/${id}`, { method: 'GET' }),

    create: (data: any) => this.request('/rooms', { method: 'POST', body: JSON.stringify(data) }),

    bulkCreate: (data: { propertyId: string; pattern: string; floor: number; baseRent: number; area?: number }) =>
      this.request('/rooms/bulk', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: any) =>
      this.request(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    changeStatus: (id: string, status: string, note?: string) =>
      this.request(`/rooms/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note }) }),

    delete: (id: string) => this.request(`/rooms/${id}`, { method: 'DELETE' }),
  };

  // ===================== TENANTS =====================
  public readonly tenants = {
    list: (params?: { q?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/tenants${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getById: (id: string) => this.request(`/tenants/${id}`, { method: 'GET' }),

    create: (data: any) => this.request('/tenants', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: any) =>
      this.request(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    invite: (id: string) => this.request(`/tenants/${id}/invite`, { method: 'POST' }),

    getHistory: (id: string) => this.request(`/tenants/${id}/history`, { method: 'GET' }),
  };

  // ===================== SERVICES =====================
  public readonly services = {
    list: (params?: { type?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/services${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    create: (data: any) => this.request('/services', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: any) =>
      this.request(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  };

  // ===================== CONTRACTS =====================
  public readonly contracts = {
    list: (params?: { propertyId?: string; roomId?: string; status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/contracts${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getById: (id: string) => this.request(`/contracts/${id}`, { method: 'GET' }),

    create: (data: any) => this.request('/contracts', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: any) =>
      this.request(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    addRevision: (id: string, data: { changes: any; effectiveFrom: string; reason: string }) =>
      this.request(`/contracts/${id}/revisions`, { method: 'POST', body: JSON.stringify(data) }),

    activate: (id: string) => this.request(`/contracts/${id}/activate`, { method: 'POST' }),

    terminate: (id: string, data: { terminationDate: string; reason?: string }) =>
      this.request(`/contracts/${id}/terminate`, { method: 'POST', body: JSON.stringify(data) }),

    renew: (id: string, data: { newEndDate: string; newRent?: number }) =>
      this.request(`/contracts/${id}/renew`, { method: 'POST', body: JSON.stringify(data) }),

    recordDeposit: (id: string, data: { action: 'COLLECTED' | 'DEDUCTED' | 'REFUNDED'; amount: number; note?: string }) =>
      this.request(`/contracts/${id}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  };

  // ===================== METERS & READINGS =====================
  public readonly meters = {
    getRoomMeters: (roomId: string) => this.request(`/rooms/${roomId}/meters`, { method: 'GET' }),

    createMeter: (roomId: string, data: any) =>
      this.request(`/rooms/${roomId}/meters`, { method: 'POST', body: JSON.stringify(data) }),

    updateMeter: (id: string, data: any) =>
      this.request(`/meters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    getReadings: (propertyId: string, period: string) =>
      this.request(`/meter-readings?propertyId=${encodeURIComponent(propertyId)}&period=${encodeURIComponent(period)}`, {
        method: 'GET',
      }),

    upsertReading: (id: string, data: { currentValue: number; flags?: string[]; note?: string }) =>
      this.request(`/meter-readings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    batchReadings: (data: { readings: any[] }) =>
      this.request('/meter-readings/batch', { method: 'POST', body: JSON.stringify(data) }),

    lockReadings: (propertyId: string, period: string) =>
      this.request('/meter-readings/lock', { method: 'POST', body: JSON.stringify({ propertyId, period }) }),
  };

  // ===================== BILLING PERIODS =====================
  public readonly billingPeriods = {
    list: (propertyId?: string) => {
      const q = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : '';
      return this.request(`/billing-periods${q}`, { method: 'GET' });
    },

    create: (data: { propertyId: string; period: string; startDate: string; endDate: string }) =>
      this.request('/billing-periods', { method: 'POST', body: JSON.stringify(data) }),

    close: (id: string) => this.request(`/billing-periods/${id}/close`, { method: 'POST' }),

    generateInvoices: (id: string) =>
      this.request(`/billing-periods/${id}/generate-invoices`, { method: 'POST' }),
  };

  // ===================== INVOICES =====================
  public readonly invoices = {
    list: (params?: { status?: string; period?: string; propertyId?: string; roomId?: string; overdue?: boolean; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/invoices${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getById: (id: string) => this.request(`/invoices/${id}`, { method: 'GET' }),

    updateDraft: (id: string, data: any) =>
      this.request(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    batchIssue: (data: { invoiceIds: string[] }) =>
      this.request('/invoices/issue', { method: 'POST', body: JSON.stringify(data) }),

    cancel: (id: string, reason: string) =>
      this.request(`/invoices/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  };

  // ===================== PAYMENTS =====================
  public readonly payments = {
    create: (data: { invoiceId: string; amount: number; method: string; note?: string; idempotencyKey?: string }) =>
      this.request('/payments', {
        method: 'POST',
        idempotencyKey: data.idempotencyKey,
        body: JSON.stringify(data),
      }),

    getById: (id: string) => this.request(`/payments/${id}`, { method: 'GET' }),

    confirm: (id: string, note?: string) =>
      this.request(`/payments/${id}/confirm`, { method: 'POST', body: JSON.stringify({ note }) }),

    reject: (id: string, reason: string) =>
      this.request(`/payments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  };

  // ===================== MAINTENANCE =====================
  public readonly maintenance = {
    list: (params?: { status?: string; priority?: string; category?: string; roomId?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/maintenance-requests${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getById: (id: string) => this.request(`/maintenance-requests/${id}`, { method: 'GET' }),

    create: (data: { title: string; category: string; description: string; priority?: string; attachmentIds?: string[] }) =>
      this.request('/maintenance-requests', { method: 'POST', body: JSON.stringify(data) }),

    transition: (id: string, data: { to: string; note?: string; cost?: { amount: number; paidBy: 'OWNER' | 'TENANT' } }) =>
      this.request(`/maintenance-requests/${id}/transition`, { method: 'POST', body: JSON.stringify(data) }),

    confirm: (id: string, rating?: number, review?: string) =>
      this.request(`/maintenance-requests/${id}/confirm`, { method: 'POST', body: JSON.stringify({ rating, review }) }),

    reopen: (id: string, reason: string) =>
      this.request(`/maintenance-requests/${id}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) }),

    cancel: (id: string, reason?: string) =>
      this.request(`/maintenance-requests/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  };

  // ===================== ATTACHMENTS =====================
  public readonly attachments = {
    presign: (data: { filename: string; mimeType: string; size: number; entityType: string; entityId?: string }) =>
      this.request('/attachments/presign', { method: 'POST', body: JSON.stringify(data) }),

    complete: (id: string) => this.request(`/attachments/${id}/complete`, { method: 'POST' }),

    getUrl: (id: string) => this.request(`/attachments/${id}/url`, { method: 'GET' }),
  };

  // ===================== NOTIFICATIONS =====================
  public readonly notifications = {
    list: (params?: { cursor?: string; limit?: number; unread?: boolean }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/notifications${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getUnreadCount: () => this.request('/notifications/unread-count', { method: 'GET' }),

    markAsRead: (id: string) => this.request(`/notifications/${id}/read`, { method: 'POST' }),

    markAllAsRead: () => this.request('/notifications/read-all', { method: 'POST' }),

    broadcast: (data: { title: string; body: string; propertyId?: string; roomId?: string }) =>
      this.request('/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  };

  // ===================== REPORTS =====================
  public readonly reports = {
    getRevenue: (params?: { propertyId?: string; from?: string; to?: string; period?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/reports/revenue${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getDebt: (params?: { propertyId?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/reports/debt${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getOccupancy: (params?: { propertyId?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/reports/occupancy${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getUtilities: (params?: { propertyId?: string; period?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/reports/utilities${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    getMaintenance: (params?: { propertyId?: string; from?: string; to?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/reports/maintenance${q ? `?${q}` : ''}`, { method: 'GET' });
    },

    exportReport: (type: 'revenue' | 'debt' | 'occupancy' | 'utilities' | 'maintenance', data: { format: 'EXCEL' | 'PDF'; filter?: any }) =>
      this.request(`/reports/${type}/export`, { method: 'POST', body: JSON.stringify(data) }),
  };

  // ===================== AUDIT LOGS =====================
  public readonly auditLogs = {
    list: (params?: { entity?: string; actor?: string; from?: string; to?: string; cursor?: string; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/audit-logs${q ? `?${q}` : ''}`, { method: 'GET' });
    },
  };
}
