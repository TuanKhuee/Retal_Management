import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/client';

export interface RoomItem {
  _id: string;
  id?: string;
  code: string;
  roomNumber?: string;
  floor: number;
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  rent: number;
  deposit?: number;
  area?: number;
  feature?: string;
  tenant?: {
    id: string;
    fullName: string;
    phone: string;
    contractId?: string | null;
    paymentStatus?: 'PAID' | 'OVERDUE' | 'RESERVED' | 'PENDING';
    debtAmount?: number;
    overdueDays?: number;
  } | null;
}

export interface ContractDetail {
  _id: string;
  id?: string;
  code: string;
  contractNumber?: string;
  roomId: string;
  roomCode?: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  startDate: string;
  endDate: string;
  dueDay: number;
  rent: number;
  depositAmount: number;
  depositStatus: string;
  remainingMonths?: number;
  progressPercentage?: number;
  tenant?: {
    id: string;
    fullName: string;
    phone: string;
    cccdMasked?: string;
    cccdNumber?: string;
  };
  occupants?: { fullName: string; phone: string; relationship: string }[];
  services?: { name: string; rate: number; unit: string }[];
  terms?: string;
}

export interface TenantProfile {
  _id: string;
  id?: string;
  fullName: string;
  phone: string;
  email?: string;
  cccdNumber?: string;
  cccdMasked?: string;
  cccdLast4?: string;
  idCard?: {
    number?: string;
    numberMasked?: string;
    issueDate?: string;
    issuePlace?: string;
  };
  dateOfBirth?: string;
  hometown?: string;
  currentRoom?: string;
  status?: string;
  startDate?: string;
  trustScore?: string;
  currentDebt?: number;
  emergencyContact?: {
    fullName: string;
    phone: string;
    relationship: string;
  };
  history?: {
    contractCode: string;
    room: string;
    period: string;
    status: string;
  }[];
}

export interface MoveOutPreviewResult {
  contractId: string;
  roomCode: string;
  floor: number;
  tenantName: string;
  moveOutDate: string;
  leaseDuration: string;
  depositOriginal: number;
  deductions: {
    electricity: {
      oldReading: number;
      newReading: number;
      usage: number;
      rate: number;
      amount: number;
    };
    water: {
      oldReading: number;
      newReading: number;
      usage: number;
      rate: number;
      amount: number;
    };
    proratedRent: {
      days: number;
      amount: number;
      note?: string;
    };
    damages: {
      description: string;
      amount: number;
    };
    totalDeductions: number;
  };
  refundAmount: number;
}

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const res = await api.properties.list();
      return (res.data || []) as {
        _id: string;
        id?: string;
        name: string;
        address: string;
        totalRooms?: number;
        occupiedRooms?: number;
      }[];
    },
  });
}

export function useLandlordDashboard(propertyId?: string) {
  return useQuery({
    queryKey: ['landlord-dashboard', propertyId],
    queryFn: async () => {
      const res = await api.properties.getDashboard(propertyId || 'prop-001');
      return res.data as {
        propertyId: string;
        propertyName: string;
        totalRoomsCount: number;
        currentPeriod: string;
        momGrowth: number;
        finance: {
          currentRevenue: number;
          targetRevenue: number;
          totalDebt: number;
        };
        rooms: {
          total: number;
          occupied: number;
          vacant: number;
          maintenance: number;
          reserved: number;
          occupancyRate: string;
        };
        pendingInvoices?: {
          count: number;
          label: string;
        };
      };
    },
  });
}

export function useRooms(params?: { propertyId?: string; status?: string; floor?: number }) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: async () => {
      const res = await api.rooms.list(params);
      return (res.data || []) as RoomItem[];
    },
  });
}

export function useRoomDetail(roomId: string) {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const res = await api.rooms.getById(roomId);
      return res.data as RoomItem;
    },
    enabled: Boolean(roomId),
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: unknown) => {
      const res = await api.rooms.create(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
    },
  });
}

export function useBulkCreateRooms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: unknown) => {
      const res = await api.rooms.bulkCreate(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
    },
  });
}

export function useContracts(params?: { propertyId?: string; roomId?: string; status?: string }) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: async () => {
      const res = await api.contracts.list(params);
      return (res.data || []) as ContractDetail[];
    },
  });
}

export function useContractDetail(contractId: string) {
  return useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const res = await api.contracts.getById(contractId);
      return res.data as ContractDetail;
    },
    enabled: Boolean(contractId),
  });
}

export function useTenants(params?: { q?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: async () => {
      const res = await api.tenants.list(params);
      return (res.data || []) as TenantProfile[];
    },
  });
}

export function useTenantDetail(tenantId: string) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const res = await api.tenants.getById(tenantId);
      return res.data as TenantProfile;
    },
    enabled: Boolean(tenantId),
  });
}

export function useMoveInWizard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: unknown) => {
      const res = await api.contracts.moveIn(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
    },
  });
}

export function useMoveOutPreview() {
  return useMutation({
    mutationFn: async ({ contractId, data }: { contractId: string; data: unknown }) => {
      const res = await api.contracts.moveOutPreview(contractId, data);
      return res.data as MoveOutPreviewResult;
    },
  });
}

export function useMoveOutFinalize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contractId, data }: { contractId: string; data: unknown }) => {
      const res = await api.contracts.moveOut(contractId, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
    },
  });
}

export interface CreateTenantAccountPayload {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  cccdNumber?: string;
  roomId?: string;
  roomName?: string;
}

export function useCreateTenantAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTenantAccountPayload) => {
      const res = await api.tenants.createAccount(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-dashboard'] });
    },
  });
}

