import { describe, expect, it } from 'vitest';
import { CustomerOrderSchema, MenuItemSchema, PositiveIdSchema } from '../lib/validation';

describe('request validation', () => {
  it('normalizes valid customer order input', () => {
    const result = CustomerOrderSchema.safeParse({
      tableCode: ' a1 ',
      customerName: ' Guest ',
      items: [{ menuItemId: '4', quantity: '2' }],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      tableCode: 'a1',
      customerName: 'Guest',
      items: [{ menuItemId: 4, quantity: 2 }],
    });
  });

  it('rejects an order without items', () => {
    const result = CustomerOrderSchema.safeParse({
      tableCode: 'A1',
      customerName: 'Guest',
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a menu item with an invalid price', () => {
    const result = MenuItemSchema.safeParse({
      name: 'Coffee',
      category: 'Coffee',
      price: 0,
    });

    expect(result.success).toBe(false);
  });

  it('accepts only positive integer route ids', () => {
    expect(PositiveIdSchema.safeParse('12').data).toBe(12);
    expect(PositiveIdSchema.safeParse('0').success).toBe(false);
    expect(PositiveIdSchema.safeParse('abc').success).toBe(false);
    expect(PositiveIdSchema.safeParse('1.5').success).toBe(false);
  });
});
