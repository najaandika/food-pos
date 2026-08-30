import { z } from 'zod';

const tableStatuses = ['available', 'occupied', 'preparing', 'ready', 'waiting_payment', 'need_waiter', 'inactive'] as const;
const userRoles = ['owner', 'kasir', 'waiters'] as const;
const orderTypes = ['dine_in', 'takeaway'] as const;
const orderSources = ['qr', 'manual'] as const;
const paymentMethods = ['cash', 'qris', 'transfer'] as const;

export const MenuItemSchema = z.object({
  name: z.string().trim().min(1, 'Menu name is required').max(140),
  category: z.string().trim().min(1, 'Category is required').max(80),
  description: z.string().max(2000).optional().default(''),
  price: z.coerce.number().finite().positive('Valid price is required'),
  oldPrice: z
    .union([z.coerce.number().finite().positive(), z.null(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v))
    .nullable(),
  imageUrl: z.string().trim().max(500).optional().default(''),
  isAvailable: z.boolean().optional().default(true),
  isBestSeller: z.boolean().optional().default(false),
  badge: z
    .union([z.string().trim().max(40), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
});

export const MenuAvailabilitySchema = z.object({
  isAvailable: z.boolean({ message: 'isAvailable must be boolean' }),
});

export const TableSchema = z.object({
  code: z.string().trim().min(1, 'Table code is required').max(30).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, 'Display name is required').max(80),
  area: z.string().trim().min(1, 'Area is required').max(80),
  seats: z.coerce.number().int().min(1, 'Seats must be a positive number').max(999),
  status: z.enum(tableStatuses, { message: 'Table status is invalid' }),
});

export const StaffSchema = z.object({
  name: z.string().trim().min(1, 'Staff name is required').max(120),
  email: z.string().trim().toLowerCase().email('Valid email is required').max(160),
  role: z.enum(userRoles, { message: 'Role is invalid' }),
  password: z
    .union([z.string().min(6, 'Password needs at least 6 characters').max(255), z.literal(''), z.undefined(), z.null()])
    .optional()
    .transform((v) => {
      if (v === '' || v === null || v === undefined) return undefined;
      const trimmed = String(v).trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }),
  isActive: z.boolean().optional().default(true),
});

export const ManualOrderSchema = z.object({
  tableCode: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .transform((v) => (v === null ? undefined : v)),
  customerName: z.string().trim().min(1, 'Customer name is required').max(120).default('Walk-in Guest'),
  type: z.enum(orderTypes).default('dine_in'),
  guests: z.coerce.number().int().min(1).max(99).optional().default(1),
  notes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v === null ? undefined : v)),
  items: z
    .array(
      z.object({
        menuItemId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(999),
        notes: z
          .string()
          .max(500)
          .optional()
          .nullable()
          .transform((v) => (v === null ? undefined : v)),
      }),
    )
    .min(1, 'Order must contain at least one item'),
  source: z.enum(orderSources).optional().default('manual'),
});

export const CustomerOrderSchema = z.object({
  tableCode: z.string().trim().min(1, 'Table code is required').max(30),
  customerName: z.string().trim().min(1, 'Customer name is required').max(120),
  notes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v === null ? undefined : v)),
  items: z
    .array(
      z.object({
        menuItemId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(999),
        notes: z
          .string()
          .max(500)
          .optional()
          .nullable()
          .transform((v) => (v === null ? undefined : v)),
      }),
    )
    .min(1, 'Order must contain at least one item'),
});

export const OrderStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment', 'paid', 'cancelled'], {
    message: 'Invalid order status',
  }),
});

export const PaymentSchema = z.object({
  orderId: z.coerce.number().int().positive('orderId is required'),
  method: z.enum(paymentMethods).default('cash'),
});

export const SettingsSchema = z.object({
  profile: z
    .object({
      cafeName: z.string().trim().min(1).max(120),
      phone: z.string().trim().max(40),
      address: z.string().trim().max(500),
    })
    .partial()
    .optional(),
  tax: z
    .object({
      taxRate: z.coerce.number().min(0).max(100),
      serviceRate: z.coerce.number().min(0).max(100),
      currency: z.enum(['IDR', 'USD']).optional(),
    })
    .partial()
    .optional(),
  payments: z
    .object({
      cash: z.boolean().optional(),
      qris: z.boolean().optional(),
      transfer: z.boolean().optional(),
    })
    .partial()
    .optional(),
  qrOptions: z
    .object({
      guestOrdering: z.boolean().optional(),
      customerName: z.boolean().optional(),
      callWaiter: z.boolean().optional(),
      autoAcceptQr: z.boolean().optional(),
    })
    .partial()
    .optional(),
  hours: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        open: z.string().trim(),
        close: z.string().trim(),
        isOpen: z.boolean(),
      }),
    )
    .optional(),
});

export type MenuItemInput = z.infer<typeof MenuItemSchema>;
export type TableInput = z.infer<typeof TableSchema>;
export type StaffInput = z.infer<typeof StaffSchema>;
export type ManualOrderInput = z.infer<typeof ManualOrderSchema>;
export type CustomerOrderInput = z.infer<typeof CustomerOrderSchema>;
