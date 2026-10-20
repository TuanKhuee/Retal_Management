export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  TENANT = 'TENANT',
}

export enum Permission {
  // Property permissions
  PROPERTY_READ = 'property:read',
  PROPERTY_CREATE = 'property:create',
  PROPERTY_UPDATE = 'property:update',
  PROPERTY_DELETE = 'property:delete',

  // Room permissions
  ROOM_READ = 'room:read',
  ROOM_CREATE = 'room:create',
  ROOM_UPDATE = 'room:update',
  ROOM_DELETE = 'room:delete',

  // Tenant permissions
  TENANT_READ = 'tenant:read',
  TENANT_READ_SENSITIVE = 'tenant:read_sensitive',
  TENANT_CREATE = 'tenant:create',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',

  // Service permissions
  SERVICE_READ = 'service:read',
  SERVICE_CREATE = 'service:create',
  SERVICE_UPDATE = 'service:update',
  SERVICE_DELETE = 'service:delete',

  // Contract permissions
  CONTRACT_READ = 'contract:read',
  CONTRACT_CREATE = 'contract:create',
  CONTRACT_UPDATE = 'contract:update',
  CONTRACT_TERMINATE = 'contract:terminate',

  // Meter Reading permissions
  METER_READ = 'meter:read',
  METER_RECORD = 'meter:record',

  // Invoice permissions
  INVOICE_READ = 'invoice:read',
  INVOICE_CREATE = 'invoice:create',
  INVOICE_ISSUE = 'invoice:issue',
  INVOICE_CANCEL = 'invoice:cancel',

  // Payment permissions
  PAYMENT_READ = 'payment:read',
  PAYMENT_CREATE = 'payment:create',

  // Billing Period permissions
  BILLING_PERIOD_READ = 'billing_period:read',
  BILLING_PERIOD_MANAGE = 'billing_period:manage',

  // Debt permissions
  DEBT_READ = 'debt:read',

  // Maintenance permissions
  MAINTENANCE_READ = 'maintenance:read',
  MAINTENANCE_CREATE = 'maintenance:create',
  MAINTENANCE_UPDATE = 'maintenance:update',
  MAINTENANCE_TRANSITION = 'maintenance:transition',

  // Attachment permissions
  ATTACHMENT_UPLOAD = 'attachment:upload',
  ATTACHMENT_READ = 'attachment:read',

  // Notification permissions
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_MANAGE = 'notification:manage',

  // Organization settings
  ORG_SETTINGS_UPDATE = 'org_settings:update',

  // Audit permissions
  AUDIT_READ = 'audit:read',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: Object.values(Permission),
  [UserRole.MANAGER]: [
    Permission.PROPERTY_READ,
    Permission.PROPERTY_CREATE,
    Permission.PROPERTY_UPDATE,
    Permission.ROOM_READ,
    Permission.ROOM_CREATE,
    Permission.ROOM_UPDATE,
    Permission.SERVICE_READ,
    Permission.SERVICE_CREATE,
    Permission.SERVICE_UPDATE,
    Permission.TENANT_READ,
    Permission.TENANT_CREATE,
    Permission.TENANT_UPDATE,
    Permission.CONTRACT_READ,
    Permission.CONTRACT_CREATE,
    Permission.CONTRACT_UPDATE,
    Permission.CONTRACT_TERMINATE,
    Permission.METER_READ,
    Permission.METER_RECORD,
    Permission.INVOICE_READ,
    Permission.INVOICE_CREATE,
    Permission.INVOICE_ISSUE,
    Permission.INVOICE_CANCEL,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_CREATE,
    Permission.BILLING_PERIOD_READ,
    Permission.BILLING_PERIOD_MANAGE,
    Permission.DEBT_READ,
    Permission.MAINTENANCE_READ,
    Permission.MAINTENANCE_CREATE,
    Permission.MAINTENANCE_UPDATE,
    Permission.MAINTENANCE_TRANSITION,
    Permission.ATTACHMENT_UPLOAD,
    Permission.ATTACHMENT_READ,
    Permission.NOTIFICATION_READ,
    Permission.NOTIFICATION_MANAGE,
    Permission.AUDIT_READ,
  ],
  [UserRole.STAFF]: [
    Permission.PROPERTY_READ,
    Permission.ROOM_READ,
    Permission.SERVICE_READ,
    Permission.TENANT_READ,
    Permission.CONTRACT_READ,
    Permission.METER_READ,
    Permission.METER_RECORD,
    Permission.INVOICE_READ,
    Permission.PAYMENT_READ,
    Permission.BILLING_PERIOD_READ,
    Permission.DEBT_READ,
    Permission.MAINTENANCE_READ,
    Permission.MAINTENANCE_UPDATE,
    Permission.MAINTENANCE_TRANSITION,
    Permission.ATTACHMENT_UPLOAD,
    Permission.ATTACHMENT_READ,
    Permission.NOTIFICATION_READ,
  ],
  [UserRole.TENANT]: [
    Permission.ROOM_READ,
    Permission.SERVICE_READ,
    Permission.CONTRACT_READ,
    Permission.METER_READ,
    Permission.INVOICE_READ,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_CREATE,
    Permission.MAINTENANCE_READ,
    Permission.MAINTENANCE_CREATE,
    Permission.MAINTENANCE_UPDATE,
    Permission.ATTACHMENT_UPLOAD,
    Permission.ATTACHMENT_READ,
    Permission.NOTIFICATION_READ,
  ],
};

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPTIMISTIC_LOCK_CONFLICT = 'OPTIMISTIC_LOCK_CONFLICT',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export enum RoomStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
  AVAILABLE = 'VACANT',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceCalcMethod {
  METER = 'METER',
  PER_PERSON = 'PER_PERSON',
  PER_ROOM = 'PER_ROOM',
  FIXED = 'FIXED',
  FREE = 'FREE',
}

export enum ServiceType {
  UTILITY = 'UTILITY',
  FACILITY = 'FACILITY',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

export enum DepositStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
  FORFEITED = 'FORFEITED',
}

export enum DepositLedgerType {
  COLLECTED = 'COLLECTED',
  DEDUCTED = 'DEDUCTED',
  REFUNDED = 'REFUNDED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  VOIDED = 'VOIDED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  QR = 'QR',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'CONFIRMED', // compatibility alias
  REJECTED = 'REJECTED',
  VOIDED = 'VOIDED',
  FAILED = 'FAILED',
}

export enum BillingPeriodStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum InvoiceItemType {
  RENT = 'RENT',
  ELECTRICITY = 'ELECTRICITY',
  WATER = 'WATER',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

export enum MeterType {
  ELECTRIC = 'ELECTRIC',
  WATER = 'WATER',
}

export enum MeterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REPLACED = 'REPLACED',
}

export enum MeterReadingFlag {
  ABNORMAL = 'ABNORMAL',
  ROLLOVER = 'ROLLOVER',
  METER_REPLACED = 'METER_REPLACED',
}

export enum MeterReadingSource {
  MANUAL = 'MANUAL',
  IMPORT = 'IMPORT',
  OCR = 'OCR',
}

export enum MeterReadingStatus {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED',
}

export enum MaintenancePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum MaintenanceStatus {
  NEW = 'NEW',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REOPENED = 'REOPENED',
}

export enum AttachmentStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum NotificationType {
  INVOICE_ISSUED = 'INVOICE_ISSUED',
  INVOICE_DUE_SOON = 'INVOICE_DUE_SOON',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  MAINTENANCE_CREATED = 'MAINTENANCE_CREATED',
  MAINTENANCE_STATUS_CHANGED = 'MAINTENANCE_STATUS_CHANGED',
  CONTRACT_EXPIRING_SOON = 'CONTRACT_EXPIRING_SOON',
  BROADCAST = 'BROADCAST',
}

