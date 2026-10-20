import mongoose, { Types } from 'mongoose';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { CccdCrypto } from '../common/utils/cccd-crypto';
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  RoomStatus,
  ContractStatus,
  DepositStatus,
  DepositLedgerType,
  MeterType,
  MeterStatus,
  MeterReadingStatus,
  MeterReadingSource,
  BillingPeriodStatus,
  InvoiceStatus,
  InvoiceItemType,
  PaymentStatus,
  PaymentMethod,
  ServiceCalcMethod,
  ServiceType,
} from '../common/constants';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/rental_management?replicaSet=rs0';

async function seed() {
  const withMock = process.argv.includes('--with-mock') || process.argv.includes('--full');
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  console.log('Cleaning up ALL existing sample and test data...');
  await db.collection('users').deleteMany({});
  await db.collection('organizations').deleteMany({});
  await db.collection('memberships').deleteMany({});
  await db.collection('organization_memberships').deleteMany({});
  await db.collection('properties').deleteMany({});
  await db.collection('rooms').deleteMany({});
  await db.collection('tenants').deleteMany({});
  await db.collection('services').deleteMany({});
  await db.collection('contracts').deleteMany({});
  await db.collection('meters').deleteMany({});
  await db.collection('billing_periods').deleteMany({});
  await db.collection('meter_readings').deleteMany({});
  await db.collection('invoices').deleteMany({});
  await db.collection('payments').deleteMany({});
  await db.collection('maintenances').deleteMany({});
  await db.collection('notifications').deleteMany({});
  await db.collection('audit_logs').deleteMany({});

  // Drop legacy indexes if they exist
  try {
    await db.collection('meter_readings').dropIndex('organizationId_1_roomId_1_billingPeriod_1');
  } catch (e) {}
  try {
    await db.collection('rooms').dropIndex('organizationId_1_propertyId_1_roomNumber_1');
  } catch (e) {}
  try {
    await db.collection('payments').dropIndex('organizationId_1_idempotencyKey_1');
  } catch (e) {}

  const orgId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const demoOwnerId = new Types.ObjectId();
  const demoTenantUserId = new Types.ObjectId();
  const demoTenantRecordId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();

  // 1. Create Users
  console.log('Seeding Admin Accounts...');
  const passwordHash = await argon2.hash('Password123!', { type: argon2.argon2id });
  const demoOwnerPasswordHash = await argon2.hash('MatKhau123@', { type: argon2.argon2id });
  const demoTenantPasswordHash = await argon2.hash('MinhThu@2025', { type: argon2.argon2id });

  const usersToInsert = [
    {
      _id: ownerId,
      email: 'tuankhue81@gmail.com',
      phone: '0342291355',
      passwordHash,
      fullName: 'Trương Tuấn Khuê',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: demoOwnerId,
      email: 'owner@moonlight.vn',
      phone: '0912345678',
      passwordHash: demoOwnerPasswordHash,
      fullName: 'Chủ Trọ Moonlight',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  if (withMock) {
    usersToInsert.push({
      _id: demoTenantUserId,
      email: 'minhthu@moonlight.vn',
      phone: '0908776543',
      passwordHash: demoTenantPasswordHash,
      fullName: 'Nguyễn Thị Minh Thư',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.collection('users').insertMany(usersToInsert);

  // 2. Create Organization
  console.log('Seeding Organization...');
  await db.collection('organizations').insertOne({
    _id: orgId,
    name: 'Hệ thống nhà trọ MOONLIGHT',
    code: 'MOONLIGHT',
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 3. Create Organization Memberships
  console.log('Seeding Memberships...');
  const memberships: any[] = [
    {
      _id: new Types.ObjectId(),
      userId: ownerId,
      organizationId: orgId,
      role: UserRole.OWNER,
      propertyIds: [propertyId],
      permissions: Object.values(Permission),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new Types.ObjectId(),
      userId: demoOwnerId,
      organizationId: orgId,
      role: UserRole.OWNER,
      propertyIds: [propertyId],
      permissions: Object.values(Permission),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  if (withMock) {
    memberships.push({
      _id: new Types.ObjectId(),
      userId: demoTenantUserId,
      organizationId: orgId,
      role: UserRole.TENANT,
      tenantId: demoTenantRecordId,
      propertyIds: [propertyId],
      permissions: ROLE_PERMISSIONS[UserRole.TENANT],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.collection('memberships').insertMany(memberships);
  await db.collection('organization_memberships').insertMany(
    memberships.map((m) => ({ ...m, _id: new Types.ObjectId(), organizationId: orgId.toString() })),
  );

  // 4. Create Property
  console.log('Seeding Property...');
  await db.collection('properties').insertOne({
    _id: propertyId,
    organizationId: orgId.toString(),
    name: 'Dãy trọ MOONLIGHT',
    address: 'Đường 24A, KDC Tân Đức, Đức Hòa, Long An',
    bankAccount: {
      bankCode: 'MB',
      accountNo: '991006200399',
      accountName: 'TRUONG TUAN KHUE',
    },
    billingConfig: {
      electricityUnitPrice: 3500,
      waterUnitPrice: 25000,
      internetUnitPrice: 100000,
      garbageUnitPrice: 50000,
    },
    electricityUnitPrice: 3500,
    waterUnitPrice: 25000,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 5. Create Services
  console.log('Seeding Services...');
  const serviceElectricityId = new Types.ObjectId();
  const serviceWaterId = new Types.ObjectId();
  const serviceGarbageId = new Types.ObjectId();
  const serviceInternetId = new Types.ObjectId();

  await db.collection('services').insertMany([
    {
      _id: serviceElectricityId,
      organizationId: orgId.toString(),
      code: 'ELEC',
      name: 'Điện sinh hoạt',
      type: ServiceType.UTILITY,
      calcMethod: ServiceCalcMethod.METER,
      unit: 'kWh',
      unitPrice: 3500,
      scope: { isAllProperties: true, propertyIds: [] },
      priceHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: serviceWaterId,
      organizationId: orgId.toString(),
      code: 'WATER',
      name: 'Nước sinh hoạt',
      type: ServiceType.UTILITY,
      calcMethod: ServiceCalcMethod.METER,
      unit: 'm3',
      unitPrice: 25000,
      scope: { isAllProperties: true, propertyIds: [] },
      priceHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: serviceGarbageId,
      organizationId: orgId.toString(),
      code: 'CLEAN',
      name: 'Phí vệ sinh & rác',
      type: ServiceType.SERVICE,
      calcMethod: ServiceCalcMethod.PER_ROOM,
      unit: 'phòng',
      unitPrice: 50000,
      scope: { isAllProperties: true, propertyIds: [] },
      priceHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: serviceInternetId,
      organizationId: orgId.toString(),
      code: 'WIFI',
      name: 'Internet cáp quang',
      type: ServiceType.SERVICE,
      calcMethod: ServiceCalcMethod.FIXED,
      unit: 'tháng',
      unitPrice: 100000,
      scope: { isAllProperties: true, propertyIds: [] },
      priceHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  if (!withMock) {
    console.log('\n======================================================');
    console.log('CƠ SỞ DỮ LIỆU ĐÃ ĐƯỢC XÓA SẠCH ĐỂ TEST (CHỈ GIỮ ADMIN)!');
    console.log('======================================================');
    console.log('Tổ chức:        Hệ thống nhà trọ MOONLIGHT');
    console.log('Admin 1:        owner@moonlight.vn / 0912345678 / MatKhau123@');
    console.log('Admin 2:        tuankhue81@gmail.com / 0342291355 / Password123!');
    console.log('Tòa nhà:        Dãy trọ MOONLIGHT (0 phòng)');
    console.log('Dịch vụ cơ bản: Điện (3.5k/kWh), Nước (25k/m3), Rác, Wifi');
    console.log('Mock Data:      ĐÃ XÓA TOÀN BỘ (0 phòng, 0 khách, 0 hợp đồng, 0 hóa đơn)');
    console.log('======================================================\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  // 6. Create 10 Rooms: A101-A105 (floor 1), A201-A205 (floor 2)
  console.log('Seeding 10 Rooms (Mock Mode)...');
  const roomCodes = [
    { code: 'A101', floor: 1, status: RoomStatus.OCCUPIED },
    { code: 'A102', floor: 1, status: RoomStatus.OCCUPIED },
    { code: 'A103', floor: 1, status: RoomStatus.OCCUPIED },
    { code: 'A104', floor: 1, status: RoomStatus.OCCUPIED },
    { code: 'A105', floor: 1, status: RoomStatus.OCCUPIED },
    { code: 'A201', floor: 2, status: RoomStatus.VACANT },
    { code: 'A202', floor: 2, status: RoomStatus.VACANT },
    { code: 'A203', floor: 2, status: RoomStatus.VACANT },
    { code: 'A204', floor: 2, status: RoomStatus.VACANT },
    { code: 'A205', floor: 2, status: RoomStatus.MAINTENANCE },
  ];

  const roomMap: Record<string, Types.ObjectId> = {};
  for (const r of roomCodes) {
    const id = new Types.ObjectId();
    roomMap[r.code] = id;
    await db.collection('rooms').insertOne({
      _id: id,
      organizationId: orgId.toString(),
      propertyId,
      code: r.code,
      roomNumber: r.code,
      floor: r.floor,
      area: 25,
      baseRent: 3500000,
      basePrice: 3500000,
      status: r.status,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 7. Create 5 Tenants
  console.log('Seeding 5 Tenants with encrypted CCCD...');
  const tenantData = [
    { id: demoTenantRecordId, name: 'Nguyễn Thị Minh Thư', phone: '0908776543', cccd: '001099000001', room: 'A101' },
    { id: new Types.ObjectId(), name: 'Lê Thị Hương', phone: '0912000002', cccd: '001099000002', room: 'A102' },
    { id: new Types.ObjectId(), name: 'Phạm Quốc Đạt', phone: '0912000003', cccd: '001099000003', room: 'A103' },
    { id: new Types.ObjectId(), name: 'Hoàng Mai Linh', phone: '0912000004', cccd: '001099000004', room: 'A104' },
    { id: new Types.ObjectId(), name: 'Đỗ Minh Trí', phone: '0912000005', cccd: '001099000005', room: 'A105' },
  ];

  const tenantMap: Record<string, Types.ObjectId> = {};
  for (const t of tenantData) {
    const id = t.id;
    tenantMap[t.room] = id;
    const numberEnc = CccdCrypto.encrypt(t.cccd);
    const numberLast4 = t.cccd.slice(-4);

    await db.collection('tenants').insertOne({
      _id: id,
      organizationId: orgId.toString(),
      fullName: t.name,
      phone: t.phone,
      idCard: {
        numberEnc,
        numberLast4,
        issueDate: new Date('2021-01-15'),
        issuePlace: 'Cục Cảnh sát QLHC về TTXH',
      },
      encryptedCccd: numberEnc,
      emergencyContact: {
        name: `${t.name} (Người thân)`,
        phone: '0988000000',
        relationship: 'Gia đình',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 8. Create 5 Active Contracts
  console.log('Seeding 5 Active Contracts...');
  const contractMap: Record<string, Types.ObjectId> = {};
  let contractCounter = 1;
  for (const t of tenantData) {
    const cId = new Types.ObjectId();
    const roomId = roomMap[t.room];
    const tenantId = tenantMap[t.room];
    contractMap[t.room] = cId;

    await db.collection('contracts').insertOne({
      _id: cId,
      organizationId: orgId.toString(),
      contractNo: `HD-2026-${String(contractCounter++).padStart(4, '0')}`,
      propertyId,
      roomId,
      primaryTenantId: tenantId,
      occupants: [{ fullName: t.name, phone: t.phone }],
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      dueDay: 5,
      rent: 3500000,
      deposit: {
        amount: 3500000,
        status: DepositStatus.COLLECTED,
        ledger: [
          {
            type: DepositLedgerType.COLLECTED,
            amount: 3500000,
            date: new Date('2026-07-01'),
            note: 'Đặt cọc 1 tháng tiền phòng khi ký hợp đồng',
          },
        ],
      },
      serviceSubscriptions: [
        { serviceId: serviceElectricityId, quantity: 1 },
        { serviceId: serviceWaterId, quantity: 1 },
        { serviceId: serviceGarbageId, quantity: 1 },
        { serviceId: serviceInternetId, quantity: 1 },
      ],
      status: ContractStatus.ACTIVE,
      isCurrent: true,
      version: 1,
      createdAt: new Date('2026-07-01'),
      updatedAt: new Date('2026-07-01'),
    });

    // Update room with currentContractId
    await db.collection('rooms').updateOne(
      { _id: roomId },
      { $set: { currentContractId: cId } },
    );
  }

  // 9. Create 20 Meters (Electric + Water for 10 rooms)
  console.log('Seeding Meters...');
  const meterElectricMap: Record<string, Types.ObjectId> = {};
  const meterWaterMap: Record<string, Types.ObjectId> = {};

  for (const r of roomCodes) {
    const roomId = roomMap[r.code];
    const eId = new Types.ObjectId();
    const wId = new Types.ObjectId();
    meterElectricMap[r.code] = eId;
    meterWaterMap[r.code] = wId;

    await db.collection('meters').insertMany([
      {
        _id: eId,
        organizationId: orgId.toString(),
        roomId,
        type: MeterType.ELECTRIC,
        serialNo: `EM-${r.code}`,
        multiplier: 1,
        initialValue: 100,
        status: MeterStatus.ACTIVE,
        installedAt: new Date('2026-06-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: wId,
        organizationId: orgId.toString(),
        roomId,
        type: MeterType.WATER,
        serialNo: `WM-${r.code}`,
        multiplier: 1,
        initialValue: 20,
        status: MeterStatus.ACTIVE,
        installedAt: new Date('2026-06-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }

  // 10. Create 2 Billing Periods (2026-08 & 2026-09)
  console.log('Seeding 2 Billing Periods...');
  const bpAugId = new Types.ObjectId();
  const bpSepId = new Types.ObjectId();

  await db.collection('billing_periods').insertMany([
    {
      _id: bpAugId,
      organizationId: orgId.toString(),
      propertyId,
      period: '2026-08',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-31'),
      status: BillingPeriodStatus.CLOSED,
      closedAt: new Date('2026-09-01'),
      closedBy: ownerId.toString(),
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-09-01'),
    },
    {
      _id: bpSepId,
      organizationId: orgId.toString(),
      propertyId,
      period: '2026-09',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      status: BillingPeriodStatus.CLOSED,
      closedAt: new Date('2026-10-01'),
      closedBy: ownerId.toString(),
      createdAt: new Date('2026-09-01'),
      updatedAt: new Date('2026-10-01'),
    },
  ]);

  // 11. Create Meter Readings for 2026-08 and 2026-09
  console.log('Seeding Meter Readings...');
  const readingReadings = [
    // Kỳ 2026-08: 5 occupied rooms
    { room: 'A101', period: '2026-08', ePrev: 100, eCur: 220, wPrev: 20, wCur: 28 },
    { room: 'A102', period: '2026-08', ePrev: 100, eCur: 215, wPrev: 20, wCur: 27 },
    { room: 'A103', period: '2026-08', ePrev: 100, eCur: 230, wPrev: 20, wCur: 29 },
    { room: 'A104', period: '2026-08', ePrev: 100, eCur: 210, wPrev: 20, wCur: 26 },
    { room: 'A105', period: '2026-08', ePrev: 100, eCur: 240, wPrev: 20, wCur: 30 },
    // Kỳ 2026-09: 5 occupied rooms
    { room: 'A101', period: '2026-09', ePrev: 220, eCur: 350, wPrev: 28, wCur: 36 },
    { room: 'A102', period: '2026-09', ePrev: 215, eCur: 340, wPrev: 27, wCur: 35 },
    { room: 'A103', period: '2026-09', ePrev: 230, eCur: 365, wPrev: 29, wCur: 38 },
    { room: 'A104', period: '2026-09', ePrev: 210, eCur: 335, wPrev: 26, wCur: 34 },
    { room: 'A105', period: '2026-09', ePrev: 240, eCur: 380, wPrev: 30, wCur: 41 },
  ];

  for (const rd of readingReadings) {
    const roomId = roomMap[rd.room];
    const eConsumption = rd.eCur - rd.ePrev;
    const wConsumption = rd.wCur - rd.wPrev;

    await db.collection('meter_readings').insertMany([
      {
        _id: new Types.ObjectId(),
        organizationId: orgId.toString(),
        meterId: meterElectricMap[rd.room],
        roomId,
        propertyId,
        period: rd.period,
        billingPeriod: rd.period,
        previousValue: rd.ePrev,
        currentValue: rd.eCur,
        consumption: eConsumption,
        adjustment: 0,
        unitPrice: 3500,
        amount: eConsumption * 3500,
        flags: [],
        source: MeterReadingSource.MANUAL,
        status: MeterReadingStatus.LOCKED,
        recordedBy: ownerId.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new Types.ObjectId(),
        organizationId: orgId.toString(),
        meterId: meterWaterMap[rd.room],
        roomId,
        propertyId,
        period: rd.period,
        billingPeriod: rd.period,
        previousValue: rd.wPrev,
        currentValue: rd.wCur,
        consumption: wConsumption,
        adjustment: 0,
        unitPrice: 25000,
        amount: wConsumption * 25000,
        flags: [],
        source: MeterReadingSource.MANUAL,
        status: MeterReadingStatus.LOCKED,
        recordedBy: ownerId.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }

  // 12. Create Invoices and Payments for 2 Periods
  console.log('Seeding Invoices and Payments for 2 Billing Periods...');
  let invSeq = 1;

  for (const rd of readingReadings) {
    const roomId = roomMap[rd.room];
    const tenantId = tenantMap[rd.room];
    const contractId = contractMap[rd.room];
    const eCons = rd.eCur - rd.ePrev;
    const wCons = rd.wCur - rd.wPrev;
    const eAmount = eCons * 3500;
    const wAmount = wCons * 25000;
    const rentAmount = 3500000;
    const cleanAmount = 50000;
    const wifiAmount = 100000;
    const totalAmount = rentAmount + eAmount + wAmount + cleanAmount + wifiAmount;

    const invoiceId = new Types.ObjectId();
    const invNo = `INV-2026-${String(invSeq++).padStart(4, '0')}`;

    // Period 1 (2026-08): All 5 invoices are PAID
    // Period 2 (2026-09): 2 PAID (A101, A102), 2 PARTIALLY_PAID (A103, A104), 1 ISSUED (A105)
    let status = InvoiceStatus.PAID;
    let paidAmount = totalAmount;

    if (rd.period === '2026-09') {
      if (rd.room === 'A103') {
        status = InvoiceStatus.PARTIALLY_PAID;
        paidAmount = 2500000;
      } else if (rd.room === 'A104') {
        status = InvoiceStatus.PARTIALLY_PAID;
        paidAmount = 2000000;
      } else if (rd.room === 'A105') {
        status = InvoiceStatus.ISSUED;
        paidAmount = 0;
      }
    }

    const remainingAmount = totalAmount - paidAmount;

    await db.collection('invoices').insertOne({
      _id: invoiceId,
      organizationId: orgId.toString(),
      invoiceNumber: invNo,
      invoiceNo: invNo,
      contractId,
      propertyId,
      roomId,
      tenantId,
      billingPeriodId: rd.period,
      dueDate: rd.period === '2026-08' ? new Date('2026-08-05') : new Date('2026-09-05'),
      status,
      active: true,
      items: [
        {
          type: InvoiceItemType.RENT,
          description: `Tiền thuê phòng ${rd.room} tháng ${rd.period}`,
          quantity: 1,
          unitPrice: rentAmount,
          amount: rentAmount,
        },
        {
          type: InvoiceItemType.ELECTRICITY,
          description: `Tiền điện (${rd.ePrev} -> ${rd.eCur} = ${eCons} kWh)`,
          quantity: eCons,
          unitPrice: 3500,
          amount: eAmount,
          meterReadingSnapshot: { oldReading: rd.ePrev, newReading: rd.eCur },
        },
        {
          type: InvoiceItemType.WATER,
          description: `Tiền nước (${rd.wPrev} -> ${rd.wCur} = ${wCons} m3)`,
          quantity: wCons,
          unitPrice: 25000,
          amount: wAmount,
          meterReadingSnapshot: { oldReading: rd.wPrev, newReading: rd.wCur },
        },
        {
          type: InvoiceItemType.SERVICE,
          description: 'Phí vệ sinh & rác',
          quantity: 1,
          unitPrice: cleanAmount,
          amount: cleanAmount,
        },
        {
          type: InvoiceItemType.SERVICE,
          description: 'Internet wifi tốc độ cao',
          quantity: 1,
          unitPrice: wifiAmount,
          amount: wifiAmount,
        },
      ],
      subtotal: totalAmount,
      discount: 0,
      totalAmount,
      paidAmount,
      remainingAmount,
      version: 1,
      createdAt: rd.period === '2026-08' ? new Date('2026-08-01') : new Date('2026-09-01'),
      updatedAt: new Date(),
    });

    // Record Payment if paidAmount > 0
    if (paidAmount > 0) {
      await db.collection('payments').insertOne({
        _id: new Types.ObjectId(),
        organizationId: orgId.toString(),
        invoiceId,
        contractId,
        tenantId,
        amount: paidAmount,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        idempotencyKey: `SEED-${invNo}`,
        transactionReference: `PAY-${invNo}`,
        paymentDate: rd.period === '2026-08' ? new Date('2026-08-03') : new Date('2026-09-03'),
        status: PaymentStatus.CONFIRMED,
        confirmedBy: ownerId.toString(),
        confirmedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  console.log('\n======================================================');
  console.log('SAMPLE DATA SEEDED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('Organization:   Hệ thống nhà trọ MOONLIGHT');
  console.log('Owner Account 1: tuankhue81@gmail.com / 0342291355 / Password123!');
  console.log('Demo Owner:      owner@moonlight.vn / 0912345678 / MatKhau123@');
  console.log('Demo Tenant:     minhthu@moonlight.vn / 0908776543 / MinhThu@2025');
  console.log('Property:        Dãy trọ MOONLIGHT (10 Rooms)');
  console.log('Tenants:         5 Tenants (Minh Thư [A101], Hương, Đạt, Linh, Trí) with encrypted CCCD');
  console.log('Contracts:       5 Active Contracts (A101 - A105), Deposit 3.5M VND collected');
  console.log('Billing Periods: 2 Periods (2026-08 & 2026-09)');
  console.log('Invoices:        10 Invoices total:');
  console.log('                 - Kỳ 2026-08: 5/5 PAID');
  console.log('                 - Kỳ 2026-09: 2 PAID, 2 PARTIALLY_PAID, 1 ISSUED (unpaid)');
  console.log('Payments:        9 Payment transactions confirmed');
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
