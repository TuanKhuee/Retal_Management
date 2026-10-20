import {
  Injectable,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { TenantRepository } from './tenant.repository';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantQueryDto,
  CreateTenantAccountDto,
} from './dto/create-tenant.dto';
import { CccdCrypto } from '../../common/utils/cccd-crypto';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../common/exceptions';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { Permission, UserRole, ROLE_PERMISSIONS, RoomStatus } from '../../common/constants';
import { TenantDocument } from './schemas/tenant.schema';
import { Contract, ContractDocument } from '../contract/schemas/contract.schema';
import { Invoice, InvoiceDocument } from '../invoice/schemas/invoice.schema';
import { Room, RoomDocument } from '../property/schemas/room.schema';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../auth/repositories/user.repository';
import { MembershipRepository } from '../auth/repositories/membership.repository';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly userRepo: UserRepository,
    private readonly membershipRepo: MembershipRepository,
  ) {}

  async createTenantAccount(user: AuthenticatedUser, dto: CreateTenantAccountDto) {
    const rawPhone = dto.phone.replace(/[\s\-\.]/g, '');
    if (!rawPhone || rawPhone.length < 9) {
      throw new BusinessRuleViolationException('Số điện thoại không hợp lệ');
    }

    // 1. Hash password with argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 2. Check or create User
    let targetUser = await this.userRepo.findByPhone(rawPhone);
    if (!targetUser && dto.email) {
      targetUser = await this.userRepo.findByEmail(dto.email);
    }

    if (targetUser) {
      await this.userRepo.updatePassword(targetUser._id.toString(), passwordHash);
      if (dto.fullName) {
        await this.userRepo.updateProfile(targetUser._id.toString(), {
          fullName: dto.fullName.trim(),
          phone: rawPhone,
        });
      }
    } else {
      targetUser = await this.userRepo.create({
        phone: rawPhone,
        email: dto.email ? dto.email.trim().toLowerCase() : undefined,
        fullName: dto.fullName.trim(),
        passwordHash,
        isActive: true,
      });
    }

    // 3. Check or create Tenant profile in this organization
    let tenant = await this.tenantRepo.findByPhone(user.organizationId, rawPhone);
    const cccdRaw = dto.cccdNumber?.trim();
    const finalCccd = cccdRaw || '000000000000';
    const numberEnc = CccdCrypto.encrypt(finalCccd);
    const numberLast4 = CccdCrypto.extractLast4(finalCccd);

    if (!tenant) {
      tenant = await this.tenantRepo.create(user.organizationId, {
        fullName: dto.fullName.trim(),
        phone: rawPhone,
        email: dto.email ? dto.email.trim().toLowerCase() : undefined,
        userId: targetUser._id.toString(),
        idCard: {
          numberEnc,
          numberLast4,
        },
        encryptedCccd: numberEnc,
        cccdLast4: numberLast4,
        isActive: true,
      } as any);
    } else {
      await this.tenantRepo.updateOne(
        user.organizationId,
        { _id: tenant._id },
        {
          $set: {
            fullName: dto.fullName.trim(),
            userId: targetUser._id.toString(),
            ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
            ...(cccdRaw
              ? {
                  'idCard.numberEnc': numberEnc,
                  'idCard.numberLast4': numberLast4,
                  encryptedCccd: numberEnc,
                  cccdLast4: numberLast4,
                }
              : {}),
          },
        },
      );
      tenant = await this.tenantRepo.findById(user.organizationId, tenant._id.toString());
    }

    // 4. Ensure Membership for this user in organization with role TENANT
    let membership = await this.membershipRepo.findByUserAndOrg(
      targetUser._id.toString(),
      user.organizationId,
    );

    if (!membership) {
      membership = await this.membershipRepo.create({
        userId: targetUser._id.toString(),
        organizationId: user.organizationId,
        role: UserRole.TENANT,
        tenantId: tenant!._id.toString(),
        propertyIds: [],
        permissions: ROLE_PERMISSIONS[UserRole.TENANT],
      });
    }

    // 5. If roomId provided, assign room / update room status if vacant
    let assignedRoom: any = null;
    if (dto.roomId) {
      const room = await this.roomModel.findOne({
        _id: dto.roomId,
        organizationId: user.organizationId,
      });
      if (room) {
        if (room.status === RoomStatus.VACANT) {
          room.status = RoomStatus.OCCUPIED;
          await room.save();
        }
        assignedRoom = {
          id: room._id.toString(),
          code: room.code,
          floor: room.floor,
          baseRent: room.baseRent,
        };
      }
    }

    return {
      message: 'Tạo tài khoản khách thuê thành công',
      user: {
        id: targetUser._id.toString(),
        fullName: targetUser.fullName,
        phone: targetUser.phone,
        email: targetUser.email,
        role: UserRole.TENANT,
      },
      tenant: this.formatTenantResponse(tenant!, user),
      assignedRoom,
      credentials: {
        identifier: rawPhone,
        password: dto.password,
      },
    };
  }

  async createTenant(user: AuthenticatedUser, dto: CreateTenantDto) {
    const existing = await this.tenantRepo.findByPhone(user.organizationId, dto.phone);
    if (existing) {
      throw new ConflictException('Tenant with this phone number already exists in your organization');
    }

    const cccdRaw = dto.idCard?.number || dto.cccdNumber || '';
    if (!cccdRaw) {
      throw new BusinessRuleViolationException('ID card / CCCD number is required');
    }

    // Encrypt CCCD with AES-256-GCM
    const numberEnc = CccdCrypto.encrypt(cccdRaw);
    const numberLast4 = CccdCrypto.extractLast4(cccdRaw);

    const doc = await this.tenantRepo.create(user.organizationId, {
      fullName: dto.fullName.trim(),
      phone: dto.phone.trim(),
      email: dto.email ? dto.email.trim().toLowerCase() : undefined,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      permanentAddress: dto.permanentAddress,
      idCard: {
        numberEnc,
        numberLast4,
        issueDate: dto.idCard?.issueDate ? new Date(dto.idCard.issueDate) : undefined,
        issuePlace: dto.idCard?.issuePlace,
      },
      emergencyContact: dto.emergencyContact,
      isActive: true,
      // Compatibility fields
      encryptedCccd: numberEnc,
      cccdLast4: numberLast4,
    } as any);

    return this.formatTenantResponse(doc, user);
  }

  async getTenantById(user: AuthenticatedUser, id: string) {
    // Ownership check for TENANT role:
    // If tenant tries to access another tenant's profile, return 404 NOT FOUND
    if (user.role === UserRole.TENANT && user.tenantId !== id) {
      throw new ResourceNotFoundException('Tenant');
    }

    const tenant = await this.tenantRepo.findById(user.organizationId, id);
    if (!tenant) {
      throw new ResourceNotFoundException('Tenant');
    }

    return this.formatTenantResponse(tenant, user);
  }

  async listTenants(user: AuthenticatedUser, query: TenantQueryDto) {
    const filter: any = { isActive: true };

    const search = (query.q || (query as any).search || '').trim();
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'idCard.numberLast4': search },
        { cccdLast4: search },
      ];
    }

    const paginated = await this.tenantRepo.findPaginated(
      user.organizationId,
      filter,
      query.page,
      query.limit,
    );

    return {
      data: paginated.data.map((t) => this.formatTenantResponse(t, user)),
      meta: paginated.meta,
    };
  }

  async updateTenant(user: AuthenticatedUser, id: string, dto: UpdateTenantDto) {
    if (user.role === UserRole.TENANT && user.tenantId !== id) {
      throw new ResourceNotFoundException('Tenant');
    }

    const tenant = await this.tenantRepo.findById(user.organizationId, id);
    if (!tenant) {
      throw new ResourceNotFoundException('Tenant');
    }

    const updateData: any = {};
    if (dto.fullName) updateData.fullName = dto.fullName.trim();
    if (dto.phone) updateData.phone = dto.phone.trim();
    if (dto.email) updateData.email = dto.email.trim().toLowerCase();
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.permanentAddress) updateData.permanentAddress = dto.permanentAddress;
    if (dto.emergencyContact) updateData.emergencyContact = dto.emergencyContact;

    const cccdRaw = dto.idCard?.number || dto.cccdNumber;
    if (cccdRaw) {
      const numberEnc = CccdCrypto.encrypt(cccdRaw);
      const numberLast4 = CccdCrypto.extractLast4(cccdRaw);
      updateData.idCard = {
        numberEnc,
        numberLast4,
        issueDate: dto.idCard?.issueDate ? new Date(dto.idCard.issueDate) : tenant.idCard?.issueDate,
        issuePlace: dto.idCard?.issuePlace ?? tenant.idCard?.issuePlace,
      };
      updateData.encryptedCccd = numberEnc;
      updateData.cccdLast4 = numberLast4;
    }

    const updated = await this.tenantRepo.updateOne(
      user.organizationId,
      { _id: id } as any,
      { $set: updateData },
    );

    if (!updated) {
      throw new ResourceNotFoundException('Tenant');
    }

    return this.formatTenantResponse(updated, user);
  }

  /**
   * GET /tenants/:id/history
   * Returns rental history: contracts, rooms stayed, invoices and payment statuses
   */
  async getTenantHistory(user: AuthenticatedUser, id: string) {
    if (user.role === UserRole.TENANT && user.tenantId !== id) {
      throw new ResourceNotFoundException('Tenant');
    }

    const tenant = await this.tenantRepo.findById(user.organizationId, id);
    if (!tenant) {
      throw new ResourceNotFoundException('Tenant');
    }

    // 1. Contracts of tenant
    const contracts = await this.contractModel
      .find({ organizationId: user.organizationId, tenantId: id })
      .populate('roomId', 'code floor area baseRent')
      .populate('propertyId', 'name address')
      .sort({ createdAt: -1 })
      .exec();

    // 2. Invoices of tenant
    const invoices = await this.invoiceModel
      .find({ organizationId: user.organizationId, tenantId: id })
      .sort({ createdAt: -1 })
      .select('invoiceNumber billingPeriodId totalAmount paidAmount remainingAmount status dueDate')
      .exec();

    return {
      tenant: this.formatTenantResponse(tenant, user),
      totalContracts: contracts.length,
      contracts,
      totalInvoices: invoices.length,
      invoices,
    };
  }

  /**
   * POST /tenants/:id/invite
   * Generates invitation token to activate user account with TENANT membership
   */
  async inviteTenant(user: AuthenticatedUser, id: string) {
    const tenant = await this.tenantRepo.findById(user.organizationId, id);
    if (!tenant) {
      throw new ResourceNotFoundException('Tenant');
    }

    const invitation = await this.authService.createTenantInvitation(
      tenant.email || '',
      tenant.phone,
      tenant.fullName,
      user.organizationId,
      tenant._id.toString(),
    );

    return {
      message: 'Tenant invitation created successfully',
      tenantId: tenant._id,
      phone: tenant.phone,
      email: tenant.email,
      inviteToken: invitation.inviteToken,
      expiresIn: '7 days',
    };
  }

  /**
   * Field-level CCCD protection: only reveal decrypted number if authorized or tenant viewing self
   */
  private formatTenantResponse(doc: TenantDocument, user: AuthenticatedUser) {
    const obj = doc.toObject ? doc.toObject() : { ...doc };

    const canReadSensitive =
      user.role === UserRole.OWNER ||
      (user.role === UserRole.TENANT && user.tenantId === doc._id.toString()) ||
      (user.permissions && user.permissions.includes(Permission.TENANT_READ_SENSITIVE));

    const numberEnc = obj.idCard?.numberEnc || obj.encryptedCccd;
    const numberLast4 = obj.idCard?.numberLast4 || obj.cccdLast4 || '';

    if (!obj.idCard) {
      obj.idCard = {};
    }

    delete obj.idCard.numberEnc;
    delete obj.encryptedCccd;

    if (canReadSensitive && numberEnc) {
      try {
        obj.idCard.number = CccdCrypto.decrypt(numberEnc);
        obj.cccdNumber = obj.idCard.number;
      } catch {
        obj.idCard.number = `****${numberLast4}`;
        obj.cccdNumber = obj.idCard.number;
      }
    } else {
      obj.idCard.numberMasked = `********${numberLast4}`;
      obj.cccdMasked = obj.idCard.numberMasked;
    }

    return obj;
  }
}
