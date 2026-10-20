/**
 * Mock data for MoonLight Mobile matching Backend NestJS DTOs and Google Stitch screens
 */

export const MOCK_TOKENS = {
  accessToken: 'mock-access-token-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLW93bmVyLTAwMSIsIm9yZ0lkIjoib3JnLW1vb25saWdodC0wMDEifQ',
  refreshToken: 'mock-refresh-token-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLW93bmVyLTAwMSJ9',
  expiresIn: 3600,
};

export const MOCK_OWNER_USER = {
  id: 'user-owner-001',
  email: 'tuankhue81@gmail.com',
  phone: '0912345678',
  fullName: 'Nguyễn Văn Hùng',
  role: 'OWNER' as const,
  organizationId: 'org-moonlight-001',
  organizationName: 'Tòa nhà MoonLight Center',
  memberships: [
    {
      organizationId: 'org-moonlight-001',
      organizationName: 'Tòa nhà MoonLight Center',
      role: 'OWNER' as const,
      propertyIds: ['prop-001'],
      permissions: ['*'],
    },
  ],
};

export const MOCK_TENANT_USER = {
  id: 'user-tenant-001',
  email: 'minhthu.tran@gmail.com',
  phone: '0908776543',
  fullName: 'Trần Thị Minh Thư',
  role: 'TENANT' as const,
  organizationId: 'org-moonlight-001',
  organizationName: 'Nhà trọ MoonLight Riverside',
  tenantId: 'tenant-001',
  memberships: [
    {
      organizationId: 'org-moonlight-001',
      organizationName: 'Nhà trọ MoonLight Riverside',
      role: 'TENANT' as const,
      tenantId: 'tenant-001',
      propertyIds: ['prop-001'],
      permissions: ['read:own_room', 'read:own_invoice', 'create:ticket'],
    },
  ],
};

export const MOCK_LANDLORD_DASHBOARD = {
  propertyId: 'prop-001',
  propertyName: 'Tòa nhà MoonLight Center',
  totalRoomsCount: 20,
  currentPeriod: 'T3/2025',
  momGrowth: 12,
  finance: {
    currentRevenue: 48500000,
    targetRevenue: 51000000,
    totalDebt: 10500000,
  },
  rooms: {
    total: 20,
    occupied: 19,
    vacant: 1,
    maintenance: 0,
    reserved: 0,
    occupancyRate: '95%',
  },
  pendingInvoices: {
    count: 2,
    label: '2 hóa đơn điện nước chờ gửi',
  },
};

export const MOCK_TENANT_WORKSPACE = {
  roomCode: 'Phòng 204',
  floor: 2,
  leaseMonthsRemaining: 7,
  invoiceStatus: 'Đã phát hành',
  currentBillAmount: 3935000,
  period: 'T3/2025',
  hasVietQr: true,
  maintenanceAlert: 'Cần hỗ trợ kỹ thuật hoặc vật tư?',
};

export const MOCK_ROOM_INVITATION = {
  token: 'inv-tok-999',
  landlord: {
    id: 'user-owner-001',
    fullName: 'Nguyễn Văn Hùng',
    phone: '0903123456',
    propertyName: 'Nhà trọ MoonLight Riverside',
    address: 'Quận 7, TP. Hồ Chí Minh',
    isVerified: true,
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCXtAXRDeJDEtFXxeZ-42jO0yrxSWDCxbbXgjWVRnEjqVIFpOv8VSDgFnihm5Tfg_Q2Ieg9rRkMA242IZ-P__KWyn5AC3UFT6ePmjVf9l76c77H4w8A--JyT_1p3wXopMkdcKVxjsOxijBqWuB3gvqTZKOFO_Oq-OxKJkvRHSVtYUi4RPR8Z_MoZONpAYpJXTFu0mH7rwpR84XpE-zkUyW7iCrk9DhQFlhP92l31uw',
  },
  room: {
    id: 'room-302',
    code: 'Phòng 302',
    floor: 3,
    feature: 'Tầng 3 • Căn góc thoáng gió',
    type: 'Khép kín',
    rent: 4200000,
    deposit: 4200000,
    depositMonths: 1,
    utilities: {
      electricity: '3.500đ/kWh',
      water: '25.000đ/m³',
      wifiAndTrash: 'Miễn phí',
    },
  },
  tenant: {
    fullName: 'Trần Thị Minh Thư',
    phone: '0908 776 543',
    startDate: '01/06/2025',
    status: 'Chờ khách kích hoạt',
  },
};

export const MOCK_PROPERTIES = [
  {
    _id: 'prop-001',
    id: 'prop-001',
    name: 'Tòa nhà MoonLight Center',
    address: 'Đường số 7, Tân Hưng, Quận 7, TP.HCM',
    totalRooms: 20,
    occupiedRooms: 18,
    activeContractsCount: 18,
  },
  {
    _id: 'prop-002',
    id: 'prop-002',
    name: 'MoonLight Riverside CS2',
    address: '45 Lê Văn Lương, Tân Kiểng, Quận 7, TP.HCM',
    totalRooms: 12,
    occupiedRooms: 11,
    activeContractsCount: 11,
  },
];

export const MOCK_ROOMS = [
  {
    _id: 'room-101',
    id: 'room-101',
    code: 'Phòng 101',
    roomNumber: '101',
    floor: 1,
    status: 'OCCUPIED',
    rent: 3900000,
    deposit: 3900000,
    area: 28,
    feature: 'Gác lửng • Cửa sổ thoáng',
    tenant: {
      id: 'tenant-001',
      fullName: 'Trần Thị Minh Thư',
      phone: '0908 776 543',
      contractId: 'contract-001',
      paymentStatus: 'PAID',
    },
  },
  {
    _id: 'room-102',
    id: 'room-102',
    code: 'Phòng 102',
    roomNumber: '102',
    floor: 1,
    status: 'OCCUPIED',
    rent: 3850000,
    deposit: 3850000,
    area: 26,
    feature: 'Gác đúc • Đầy đủ tiện nghi',
    tenant: {
      id: 'tenant-002',
      fullName: 'Trần Văn Bình',
      phone: '0912 345 678',
      contractId: 'contract-002',
      paymentStatus: 'OVERDUE',
      debtAmount: 3850000,
      overdueDays: 3,
    },
  },
  {
    _id: 'room-204',
    id: 'room-204',
    code: 'Phòng 204',
    roomNumber: '204',
    floor: 2,
    status: 'OCCUPIED',
    rent: 4500000,
    deposit: 4500000,
    area: 30,
    feature: 'Ban công & Gác đúc',
    tenant: {
      id: 'tenant-003',
      fullName: 'Trần Anh Tuấn',
      phone: '0988 123 456',
      contractId: 'contract-003',
      paymentStatus: 'PAID',
    },
  },
  {
    _id: 'room-201',
    id: 'room-201',
    code: 'Phòng 201',
    roomNumber: '201',
    floor: 2,
    status: 'VACANT',
    rent: 3500000,
    deposit: 3500000,
    area: 25,
    feature: 'Studio khép kín • Sẵn vào ở',
    tenant: null,
  },
  {
    _id: 'room-202',
    id: 'room-202',
    code: 'Phòng 202',
    roomNumber: '202',
    floor: 2,
    status: 'RESERVED',
    rent: 3600000,
    deposit: 3600000,
    area: 25,
    feature: 'Cửa sổ giếng trời • Đã nhận cọc',
    tenant: {
      id: 'tenant-004',
      fullName: 'Ngô Thanh Hằng',
      phone: '0977 112 233',
      contractId: null,
      paymentStatus: 'RESERVED',
    },
  },
  {
    _id: 'room-205',
    id: 'room-205',
    code: 'Phòng 205',
    roomNumber: '205',
    floor: 2,
    status: 'MAINTENANCE',
    rent: 3500000,
    deposit: 3500000,
    area: 25,
    feature: 'Đang sơn nước & bảo trì điện',
    tenant: null,
  },
];

export const MOCK_CONTRACTS = [
  {
    _id: 'contract-003',
    id: 'contract-003',
    code: 'HD-2024-082',
    contractNumber: 'HD-2024-082',
    roomId: 'room-204',
    roomCode: 'Phòng 204',
    status: 'ACTIVE',
    startDate: '2024-08-01',
    endDate: '2025-07-31',
    dueDay: 5,
    rent: 4500000,
    depositAmount: 4500000,
    depositStatus: 'COLLECTED',
    remainingMonths: 5,
    progressPercentage: 58,
    tenant: {
      id: 'tenant-003',
      fullName: 'Trần Anh Tuấn',
      phone: '0988 123 456',
      cccdMasked: '•••• •••• 1234',
    },
    occupants: [
      { fullName: 'Trần Anh Tuấn', phone: '0988123456', relationship: 'Trưởng phòng' },
      { fullName: 'Lê Hoàng Nam', phone: '0912348888', relationship: 'Bạn ở ghép' },
    ],
    services: [
      { name: 'Điện sinh hoạt', rate: 3500, unit: 'kWh' },
      { name: 'Nước máy sinh hoạt', rate: 25000, unit: 'm³' },
      { name: 'Wifi & Rác sinh hoạt', rate: 100000, unit: 'phòng/tháng' },
    ],
    terms: 'Thanh toán tiền phòng định kỳ từ ngày 1 đến ngày 5 mỗi tháng. Giữ gìn an ninh trật tự sau 23h.',
  },
];

export const MOCK_TENANTS = [
  {
    _id: 'tenant-003',
    id: 'tenant-003',
    fullName: 'Trần Anh Tuấn',
    phone: '0988 123 456',
    email: 'anhtuan.tran@gmail.com',
    cccdNumber: '079201001234',
    cccdMasked: '•••• •••• 1234',
    cccdLast4: '1234',
    idCard: {
      number: '079201001234',
      numberMasked: '•••• •••• 1234',
      issueDate: '2021-04-12',
      issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    },
    dateOfBirth: '1998-09-15',
    hometown: 'Hải Châu, Đà Nẵng',
    currentRoom: 'Phòng 204 • MoonLight Riverside',
    status: 'ACTIVE',
    startDate: '01/08/2024',
    trustScore: '100%',
    currentDebt: 0,
    emergencyContact: {
      fullName: 'Trần Văn Hưng (Bố)',
      phone: '0903 556 778',
      relationship: 'Phụ huynh',
    },
    history: [
      {
        contractCode: 'HD-2024-082',
        room: 'Phòng 204',
        period: '08/2024 - 07/2025',
        status: 'Đang thuê',
      },
      {
        contractCode: 'HD-2023-019',
        room: 'Phòng 102',
        period: '08/2023 - 07/2024',
        status: 'Đã hoàn cọc',
      },
    ],
  },
];

export const MOCK_CHECKOUT_PREVIEW = {
  contractId: 'contract-003',
  roomCode: 'Phòng 204',
  floor: 2,
  tenantName: 'Trần Anh Tuấn',
  moveOutDate: '2025-05-28',
  leaseDuration: '12 tháng (Hết hạn)',
  depositOriginal: 4500000,
  deductions: {
    electricity: {
      oldReading: 1450,
      newReading: 1580,
      usage: 130,
      rate: 3500,
      amount: 455000,
    },
    water: {
      oldReading: 82,
      newReading: 87,
      usage: 5,
      rate: 25000,
      amount: 125000,
    },
    proratedRent: {
      days: 10,
      amount: 1500000,
      note: '18/05 - 28/05 (150.000 ₫/ngày)',
    },
    damages: {
      description: 'Vệ sinh sâu & Sơn dặm tường',
      amount: 200000,
    },
    totalDeductions: 2280000,
  },
  refundAmount: 2220000,
};
