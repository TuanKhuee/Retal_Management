import { BillingCalculator } from './billing-calculator';
import { ServiceCalcMethod } from '../constants';

describe('BillingCalculator', () => {
  describe('roundToStep', () => {
    it('should round amounts to the nearest 1000 VND by default', () => {
      expect(BillingCalculator.roundToStep(123456, 1000)).toBe(123000);
      expect(BillingCalculator.roundToStep(123789, 1000)).toBe(124000);
      expect(BillingCalculator.roundToStep(123500, 1000)).toBe(124000);
    });

    it('should round amounts to custom step (e.g., 500 VND)', () => {
      expect(BillingCalculator.roundToStep(123249, 500)).toBe(123000);
      expect(BillingCalculator.roundToStep(123250, 500)).toBe(123500);
      expect(BillingCalculator.roundToStep(123749, 500)).toBe(123500);
    });

    it('should return integers without float precision issues', () => {
      const rounded = BillingCalculator.roundToStep(3500000.333333, 1000);
      expect(Number.isInteger(rounded)).toBe(true);
      expect(rounded).toBe(3500000);
    });
  });

  describe('calculateBilling - Core Pure Business Logic', () => {
    it('Ví dụ chuẩn prompt: 3.000.000 + 455.000 + 300.000 + 50.000 + 30.000 + 100.000 = 3.935.000', () => {
      // Setup contract & services matching prompt standard calculation
      const result = BillingCalculator.calculateBilling({
        contract: {
          rent: 3000000,
          startDate: '2026-10-01',
          endDate: '2027-10-01',
        },
        occupantCount: 3,
        period: '2026-10',
        roundingStep: 1000,
        serviceSubscriptions: [
          {
            serviceCode: 'ELEC',
            serviceName: 'Tiền điện',
            calcMethod: ServiceCalcMethod.METER,
            unitPrice: 3500,
          },
          {
            serviceCode: 'WATER',
            serviceName: 'Tiền nước sinh hoạt',
            calcMethod: ServiceCalcMethod.PER_PERSON,
            unitPrice: 100000, // 3 * 100,000 = 300,000
          },
          {
            serviceCode: 'INTERNET',
            serviceName: 'Internet wifi cáp quang',
            calcMethod: ServiceCalcMethod.FIXED,
            unitPrice: 50000, // 50,000
            quantity: 1,
          },
          {
            serviceCode: 'GARBAGE',
            serviceName: 'Phí rác sinh hoạt',
            calcMethod: ServiceCalcMethod.PER_ROOM,
            unitPrice: 30000, // 30,000
            quantity: 1,
          },
          {
            serviceCode: 'PARKING',
            serviceName: 'Phí gửi xe máy',
            calcMethod: ServiceCalcMethod.FIXED,
            unitPrice: 100000, // 100,000
            quantity: 1,
          },
          {
            serviceCode: 'CLEANING',
            serviceName: 'Dọn dẹp công cộng',
            calcMethod: ServiceCalcMethod.FREE,
            unitPrice: 0,
          },
        ],
        readings: [
          {
            serviceCode: 'ELEC',
            consumption: 130, // 130 kWh * 3,500 = 455,000
            unitPrice: 3500,
          },
        ],
      });

      expect(result.period).toBe('2026-10');
      expect(result.daysInMonth).toBe(31);
      expect(result.daysStayed).toBe(31);
      expect(result.isProrated).toBe(false);
      expect(result.rent).toBe(3000000);

      // Verify each individual line item
      const elecItem = result.items.find((i) => i.serviceCode === 'ELEC');
      expect(elecItem?.amount).toBe(455000);

      const waterItem = result.items.find((i) => i.serviceCode === 'WATER');
      expect(waterItem?.amount).toBe(300000);

      const netItem = result.items.find((i) => i.serviceCode === 'INTERNET');
      expect(netItem?.amount).toBe(50000);

      const garbageItem = result.items.find((i) => i.serviceCode === 'GARBAGE');
      expect(garbageItem?.amount).toBe(30000);

      const parkingItem = result.items.find((i) => i.serviceCode === 'PARKING');
      expect(parkingItem?.amount).toBe(100000);

      const freeItem = result.items.find((i) => i.serviceCode === 'CLEANING');
      expect(freeItem?.amount).toBe(0);

      // Total must be exactly 3,935,000
      expect(result.subtotal).toBe(3935000);
      expect(result.total).toBe(3935000);
    });

    it('Prorate ca biên: vào giữa kỳ (start on 16th of 31-day month -> 16 days stayed)', () => {
      const result = BillingCalculator.calculateBilling({
        contract: {
          rent: 3100000,
          startDate: '2026-10-16',
        },
        occupantCount: 1,
        period: '2026-10', // 31 days
        roundingStep: 1000,
        serviceSubscriptions: [],
      });

      expect(result.daysInMonth).toBe(31);
      expect(result.daysStayed).toBe(16); // 16 to 31 = 16 days
      expect(result.isProrated).toBe(true);
      // 3,100,000 * 16 / 31 = 1,600,000
      expect(result.rent).toBe(1600000);
      expect(result.total).toBe(1600000);
    });

    it('Prorate ca biên: ra giữa kỳ (contract ends on 10th of month -> 10 days stayed)', () => {
      const result = BillingCalculator.calculateBilling({
        contract: {
          rent: 3000000,
          startDate: '2026-01-01',
          endDate: '2026-10-10',
        },
        occupantCount: 1,
        period: '2026-10',
        roundingStep: 1000,
      });

      expect(result.daysStayed).toBe(10);
      expect(result.isProrated).toBe(true);
      // 3,000,000 * 10 / 31 = 967,741.9 -> round to 968,000
      expect(result.rent).toBe(968000);
      expect(result.total).toBe(968000);
    });

    it('Ca biên: 0 tiêu thụ (METER consumption = 0 -> amount = 0)', () => {
      const result = BillingCalculator.calculateBilling({
        contract: {
          rent: 2000000,
          startDate: '2026-10-01',
        },
        occupantCount: 1,
        period: '2026-10',
        serviceSubscriptions: [
          {
            serviceCode: 'ELEC',
            calcMethod: ServiceCalcMethod.METER,
            unitPrice: 4000,
          },
        ],
        readings: [
          {
            serviceCode: 'ELEC',
            consumption: 0,
          },
        ],
      });

      const elecItem = result.items.find((i) => i.serviceCode === 'ELEC');
      expect(elecItem?.amount).toBe(0);
      expect(result.total).toBe(2000000);
    });

    it('Ca biên: Discount và Adjustments (total = rent + items - discounts + adjustments)', () => {
      const result = BillingCalculator.calculateBilling({
        contract: {
          rent: 3000000,
          startDate: '2026-10-01',
        },
        occupantCount: 1,
        period: '2026-10',
        discounts: 200000,
        adjustments: 50000,
        serviceSubscriptions: [
          {
            serviceCode: 'FIXED',
            calcMethod: ServiceCalcMethod.FIXED,
            unitPrice: 150000,
          },
        ],
      });

      // Subtotal = 3,000,000 + 150,000 = 3,150,000
      // Total = 3,150,000 - 200,000 + 50,000 = 3,000,000
      expect(result.subtotal).toBe(3150000);
      expect(result.discounts).toBe(200000);
      expect(result.adjustments).toBe(50000);
      expect(result.total).toBe(3000000);
    });

    it('Ca biên: Làm tròn theo roundingStep = 500', () => {
      const result = BillingCalculator.calculateBilling({
        contract: {
          rent: 3000249,
          startDate: '2026-10-01',
        },
        occupantCount: 1,
        period: '2026-10',
        roundingStep: 500,
      });

      expect(result.rent).toBe(3000000);
      expect(result.total).toBe(3000000);
    });
  });
});
