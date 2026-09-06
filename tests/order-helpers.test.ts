import { describe, expect, it } from 'vitest';
import {
  calculateOrderTotal,
  clampRate,
  normalizeOrderItems,
  reportRange,
  tableStatusByOrderStatus,
} from '../lib/repositories/helpers';

describe('order business helpers', () => {
  it('calculates tax, service charge, and total', () => {
    expect(calculateOrderTotal(100000, { tax: { taxRate: 5, serviceRate: 10 } })).toEqual({
      tax: 5000,
      serviceCharge: 10000,
      total: 115000,
    });
  });

  it('normalizes valid items and removes invalid quantities', () => {
    expect(
      normalizeOrderItems([
        { menuItemId: 4, quantity: 2.8, notes: '  less sugar  ' },
        { menuItemId: 5, quantity: 0 },
        { menuItemId: -1, quantity: 1 },
      ]),
    ).toEqual([{ menuItemId: 4, quantity: 2, notes: 'less sugar' }]);
  });

  it('clamps rates to the supported percentage range', () => {
    expect(clampRate(-10)).toBe(0);
    expect(clampRate(125)).toBe(100);
    expect(clampRate('invalid')).toBe(0);
    expect(clampRate(7.5)).toBe(7.5);
  });

  it('maps active order statuses to table statuses', () => {
    expect(tableStatusByOrderStatus.pending).toBe('occupied');
    expect(tableStatusByOrderStatus.preparing).toBe('preparing');
    expect(tableStatusByOrderStatus.waiting_payment).toBe('waiting_payment');
  });

  it('falls back to a valid report range when dates are reversed', () => {
    const range = reportRange('2030-02-10', '2030-02-01');

    expect(range.fromDate.getTime()).toBeLessThanOrEqual(range.toDate.getTime());
    expect(range.toDate.getHours()).toBe(0);
  });
});
