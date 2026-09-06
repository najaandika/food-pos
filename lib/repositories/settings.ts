import { prisma } from '../prisma';
import type { PosSettings } from '../pos-types';
import { clampRate } from './helpers';

export const defaultSettings: PosSettings = {
  profile: {
    cafeName: 'POS',
    phone: '+62 812-0000-0000',
    address: 'Global location',
  },
  tax: {
    taxRate: 5,
    serviceRate: 0,
    currency: 'IDR',
  },
  payments: {
    cash: true,
    qris: true,
    transfer: false,
  },
  qrOptions: {
    guestOrdering: true,
    customerName: true,
    callWaiter: true,
    autoAcceptQr: false,
  },
  hours: [
    { label: 'Monday - Thursday', open: '09:00', close: '22:00', isOpen: true },
    { label: 'Friday', open: '08:00', close: '23:00', isOpen: true },
    { label: 'Saturday - Sunday', open: '08:00', close: '23:00', isOpen: true },
  ],
};

function normalizeSettings(value: unknown): PosSettings {
  const input = value && typeof value === 'object' ? (value as Partial<PosSettings>) : {};
  const payments = {
    cash: input.payments?.cash !== false,
    qris: input.payments?.qris !== false,
    transfer: Boolean(input.payments?.transfer),
  };

  if (!payments.cash && !payments.qris && !payments.transfer) {
    payments.cash = true;
  }

  return {
    profile: {
      cafeName: String(input.profile?.cafeName ?? defaultSettings.profile.cafeName).trim() || defaultSettings.profile.cafeName,
      phone: String(input.profile?.phone ?? defaultSettings.profile.phone).trim(),
      address: String(input.profile?.address ?? defaultSettings.profile.address).trim(),
    },
    tax: {
      taxRate: clampRate(input.tax?.taxRate ?? defaultSettings.tax.taxRate),
      serviceRate: clampRate(input.tax?.serviceRate ?? defaultSettings.tax.serviceRate),
      currency: input.tax?.currency === 'USD' ? 'USD' : 'IDR',
    },
    payments,
    qrOptions: {
      guestOrdering: input.qrOptions?.guestOrdering !== false,
      customerName: input.qrOptions?.customerName !== false,
      callWaiter: input.qrOptions?.callWaiter !== false,
      autoAcceptQr: Boolean(input.qrOptions?.autoAcceptQr),
    },
    hours:
      Array.isArray(input.hours) && input.hours.length
        ? input.hours.map((hour, index) => ({
            label: String(hour.label ?? defaultSettings.hours[index]?.label ?? 'Business Hours').trim(),
            open: String(hour.open ?? '09:00').trim(),
            close: String(hour.close ?? '22:00').trim(),
            isOpen: hour.isOpen !== false,
          }))
        : defaultSettings.hours,
  };
}

export async function getSettings(): Promise<PosSettings> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'cafe' } });
  if (!setting) return defaultSettings;

  return normalizeSettings(setting.value);
}

export async function updateSettings(input: unknown): Promise<PosSettings> {
  const settings = normalizeSettings(input);

  await prisma.appSetting.upsert({
    where: { key: 'cafe' },
    create: { key: 'cafe', value: settings },
    update: { value: settings },
  });

  return settings;
}
