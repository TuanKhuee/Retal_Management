import { ServiceCalcMethod } from '../constants';

export interface UtilityCalculationInput {
  oldReading: number;
  newReading: number;
  unitPrice: number;
}

export interface ProratedRentInput {
  monthlyRent: number;
  daysStayed: number;
  daysInMonth: number;
}

export interface InvoiceItemCalculation {
  type: string;
  description: string;
  quantity: number;
  unitPrice: number; // integer VND
  amount: number; // quantity * unitPrice (rounded)
}

export interface BillingContractInput {
  rent?: number;
  rentalPrice?: number;
  startDate: Date | string;
  endDate?: Date | string | null;
}

export interface BillingServiceSubscriptionInput {
  serviceId?: string;
  serviceCode?: string;
  serviceName?: string;
  calcMethod: ServiceCalcMethod | string;
  unitPrice: number;
  quantity?: number;
  meterType?: string;
}

export interface BillingReadingInput {
  serviceCode?: string;
  meterType?: string;
  consumption: number;
  unitPrice?: number;
}

export interface BillingCalculationInput {
  contract: BillingContractInput;
  serviceSubscriptions?: BillingServiceSubscriptionInput[];
  readings?: BillingReadingInput[];
  occupantCount: number;
  period: string; // 'YYYY-MM'
  roundingStep?: number; // default 1000
  discounts?: number;
  adjustments?: number;
}

export interface BillingLineItemResult {
  serviceId?: string;
  serviceCode?: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BillingCalculationResult {
  period: string;
  daysInMonth: number;
  daysStayed: number;
  isProrated: boolean;
  rent: number;
  items: BillingLineItemResult[];
  subtotal: number;
  discounts: number;
  adjustments: number;
  total: number;
}

export class BillingCalculator {
  /**
   * Rounds an amount in VND according to organization roundingStep (e.g., 1000, 500, 100).
   * Result is always an integer.
   */
  static roundToStep(amount: number, roundingStep = 1000): number {
    if (!roundingStep || roundingStep <= 1) {
      return Math.round(amount);
    }
    return Math.round(amount / roundingStep) * roundingStep;
  }

  /**
   * Calculates utility consumption and total amount in integer VND.
   */
  static calculateUtility(
    input: UtilityCalculationInput,
    roundingStep = 1000,
  ): { units: number; amount: number } {
    if (input.newReading < input.oldReading) {
      throw new Error(`New reading (${input.newReading}) cannot be less than old reading (${input.oldReading})`);
    }
    const units = Math.max(0, input.newReading - input.oldReading);
    const rawAmount = units * Math.round(input.unitPrice);
    const amount = this.roundToStep(rawAmount, roundingStep);
    return { units, amount };
  }

  /**
   * Calculates prorated rent for partial month in integer VND.
   */
  static calculateProratedRent(
    input: ProratedRentInput,
    roundingStep = 1000,
  ): number {
    if (input.daysInMonth <= 0 || input.daysStayed <= 0) {
      return 0;
    }
    const ratio = Math.min(input.daysStayed, input.daysInMonth) / input.daysInMonth;
    const rawAmount = Math.round(input.monthlyRent * ratio);
    return this.roundToStep(rawAmount, roundingStep);
  }

  /**
   * Computes subtotal, discounts, and final total in integer VND.
   */
  static calculateInvoiceTotal(
    items: { quantity: number; unitPrice: number }[],
    discount = 0,
    roundingStep = 1000,
  ): { subtotal: number; discount: number; totalAmount: number } {
    let subtotal = 0;
    for (const item of items) {
      const itemAmount = Math.round(item.quantity * Math.round(item.unitPrice));
      subtotal += itemAmount;
    }
    const sanitizedDiscount = Math.max(0, Math.min(subtotal, Math.round(discount)));
    const rawTotal = Math.max(0, subtotal - sanitizedDiscount);
    const totalAmount = this.roundToStep(rawTotal, roundingStep);

    return {
      subtotal: Math.round(subtotal),
      discount: sanitizedDiscount,
      totalAmount,
    };
  }

  /**
   * PURE Billing Calculation Core (không phụ thuộc DB)
   * Input: contract + serviceSubscriptions + readings + occupantCount + kỳ
   * Amount rules:
   *   - METER = consumption * unitPrice
   *   - PER_PERSON = occupantCount * unitPrice
   *   - PER_ROOM / FIXED = quantity * unitPrice
   *   - FREE = 0
   *   - rent prorate theo ngày khi vào/ra giữa kỳ
   *   - làm tròn roundingStep
   *   - total = rent + items - discounts + adjustments
   */
  static calculateBilling(input: BillingCalculationInput): BillingCalculationResult {
    const roundingStep = input.roundingStep ?? 1000;
    const period = input.period.trim();

    // 1. Phân tích số ngày trong tháng của kỳ 'YYYY-MM'
    const parts = period.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10); // 1 - 12
    const daysInMonth = new Date(year, month, 0).getDate();

    // 2. Tính số ngày lưu trú thực tế trong kỳ (Prorate rent)
    const baseRent = input.contract.rent ?? input.contract.rentalPrice ?? 0;
    const contractStartDate = new Date(input.contract.startDate);
    const contractEndDate = input.contract.endDate ? new Date(input.contract.endDate) : null;

    const periodStartDate = new Date(year, month - 1, 1);
    const periodEndDate = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

    let daysStayed = daysInMonth;
    let isProrated = false;

    // Chuẩn hóa ngày không tính giờ phút giây
    const cStartDay = new Date(
      contractStartDate.getFullYear(),
      contractStartDate.getMonth(),
      contractStartDate.getDate(),
    );
    const pStartDay = new Date(year, month - 1, 1);
    const pEndDay = new Date(year, month - 1, daysInMonth);

    if (cStartDay > pEndDay || (contractEndDate && new Date(contractEndDate.getFullYear(), contractEndDate.getMonth(), contractEndDate.getDate()) < pStartDay)) {
      daysStayed = 0;
      isProrated = true;
    } else {
      let startDayNumber = 1;
      if (cStartDay > pStartDay) {
        startDayNumber = cStartDay.getDate();
        isProrated = true;
      }

      let endDayNumber = daysInMonth;
      if (contractEndDate) {
        const cEndDay = new Date(
          contractEndDate.getFullYear(),
          contractEndDate.getMonth(),
          contractEndDate.getDate(),
        );
        if (cEndDay < pEndDay) {
          endDayNumber = cEndDay.getDate();
          isProrated = true;
        }
      }

      daysStayed = Math.max(0, endDayNumber - startDayNumber + 1);
      if (daysStayed >= daysInMonth) {
        daysStayed = daysInMonth;
        isProrated = false;
      }
    }

    let calculatedRent = 0;
    if (daysStayed === daysInMonth) {
      calculatedRent = this.roundToStep(baseRent, roundingStep);
    } else if (daysStayed > 0) {
      const rawRent = (baseRent * daysStayed) / daysInMonth;
      calculatedRent = this.roundToStep(rawRent, roundingStep);
    }

    // 3. Tính toán từng mục dịch vụ (Service Subscriptions)
    const items: BillingLineItemResult[] = [];
    const subscriptions = input.serviceSubscriptions || [];
    const readings = input.readings || [];

    for (const sub of subscriptions) {
      let quantity = 0;
      let unitPrice = sub.unitPrice;
      let amount = 0;
      const method = sub.calcMethod;

      switch (method) {
        case ServiceCalcMethod.METER: {
          // Khớp chỉ số theo serviceCode hoặc meterType
          const matchedReading = readings.find(
            (r) =>
              (sub.serviceCode && r.serviceCode && r.serviceCode.toUpperCase() === sub.serviceCode.toUpperCase()) ||
              (sub.meterType && r.meterType && r.meterType.toUpperCase() === sub.meterType.toUpperCase()) ||
              (!sub.serviceCode && !sub.meterType),
          );
          quantity = matchedReading ? Math.max(0, matchedReading.consumption) : 0;
          if (matchedReading?.unitPrice !== undefined) {
            unitPrice = matchedReading.unitPrice;
          }
          amount = this.roundToStep(quantity * unitPrice, roundingStep);
          break;
        }

        case ServiceCalcMethod.PER_PERSON: {
          quantity = Math.max(0, input.occupantCount);
          amount = this.roundToStep(quantity * unitPrice, roundingStep);
          break;
        }

        case ServiceCalcMethod.PER_ROOM:
        case ServiceCalcMethod.FIXED: {
          quantity = sub.quantity !== undefined && sub.quantity !== null ? sub.quantity : 1;
          amount = this.roundToStep(quantity * unitPrice, roundingStep);
          break;
        }

        case ServiceCalcMethod.FREE: {
          quantity = 1;
          unitPrice = 0;
          amount = 0;
          break;
        }

        default: {
          quantity = sub.quantity ?? 1;
          amount = this.roundToStep(quantity * unitPrice, roundingStep);
          break;
        }
      }

      items.push({
        serviceId: sub.serviceId,
        serviceCode: sub.serviceCode,
        type: typeof method === 'string' ? method : String(method),
        description: sub.serviceName || `Dịch vụ ${sub.serviceCode || ''}`.trim(),
        quantity,
        unitPrice,
        amount,
      });
    }

    // 4. Tổng cộng: total = rent + items - discounts + adjustments
    const itemsSum = items.reduce((sum, item) => sum + item.amount, 0);
    const subtotal = calculatedRent + itemsSum;
    const discounts = Math.max(0, input.discounts || 0);
    const adjustments = input.adjustments || 0;

    const rawTotal = Math.max(0, subtotal - discounts + adjustments);
    const total = this.roundToStep(rawTotal, roundingStep);

    return {
      period,
      daysInMonth,
      daysStayed,
      isProrated,
      rent: calculatedRent,
      items,
      subtotal,
      discounts,
      adjustments,
      total,
    };
  }
}
