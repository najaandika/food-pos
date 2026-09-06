import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL must be configured');

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });
const demoPassword = 'blocbarat';

const categories = [
  ['Coffee', 1],
  ['Non Coffee', 2],
  ['Food', 3],
  ['Snack', 4],
  ['Signature', 5],
  ['Breakfast', 6],
  ['Promo', 7],
] as const;

const tables = [
  ['A1', 'Indoor Window', 'Indoor', 2, 'available', 18],
  ['A4', 'Indoor Center', 'Indoor', 4, 'ready', 42],
  ['A9', 'Indoor Sofa', 'Indoor', 4, 'waiting_payment', 31],
  ['B2', 'Bar Area', 'Bar', 2, 'preparing', 24],
  ['B7', 'Outdoor Bench', 'Outdoor', 4, 'need_waiter', 27],
  ['C2', 'Terrace', 'Terrace', 3, 'waiting_payment', 22],
  ['O1', 'Outdoor Surf Corner', 'Outdoor', 4, 'inactive', 9],
] as const;

const menuItems = [
  ['Coffee', 'Bloc Barat Latte', 'Espresso, fresh milk, and smooth house syrup.', 32000, null, true, true, 'Signature', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'],
  ['Signature', 'Krui Sunset Mocktail', 'Tropical citrus, soda, and beach-day freshness.', 36000, null, true, true, 'Best Seller', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80'],
  ['Coffee', 'Iced Americano', 'Clean espresso over ice for a bright afternoon.', 26000, null, true, false, null, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80'],
  ['Food', 'Chicken Rice Bowl', 'Grilled chicken, warm rice, egg, and house sauce.', 45000, null, true, false, null, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'],
  ['Snack', 'Crispy Fries', 'Golden fries with Bloc Barat dipping sauce.', 28000, null, true, false, null, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80'],
  ['Non Coffee', 'Matcha Cloud', 'Creamy matcha latte with a soft vanilla finish.', 35000, null, true, false, null, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'],
  ['Breakfast', 'Scrambled Eggs With Toast', 'Perfectly seasoned scrambled eggs served with warm toast.', 16990, null, true, true, 'Popular', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80'],
  ['Breakfast', 'Greek Yogurt Parfait', 'Creamy Greek yogurt layered with ripe fruit and granola.', 21490, null, true, false, null, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80'],
  ['Breakfast', 'Vegetable Omelette', 'Farm-fresh eggs filled with colorful seasonal vegetables.', 17090, 18990, false, false, 'Disc 10%', 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=600&q=80'],
  ['Breakfast', 'Smoked Salmon Bagel', 'A savory brunch classic with salmon and cream cheese.', 18990, null, true, false, null, 'https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?auto=format&fit=crop&w=600&q=80'],
  ['Breakfast', 'Belgian Waffles', 'Crisp golden exterior with a soft, buttery interior.', 19490, null, true, false, null, 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80'],
] as const;

async function main() {
  const passwordHash = await hashPassword(demoPassword);

  for (const [name, email, role] of [
    ['Owner Bloc Barat', 'owner@blocbarat.local', 'owner'],
    ['Gladina Samantha', 'cashier@blocbarat.local', 'kasir'],
    ['Gladina Samantha', 'waiters@blocbarat.local', 'waiters'],
  ] as const) {
    await prisma.user.upsert({
      where: { email },
      create: { name, email, passwordHash, role },
      update: { name, role, isActive: true },
    });
  }

  for (const [name, sortOrder] of categories) {
    await prisma.category.upsert({
      where: { name },
      create: { name, sortOrder, isActive: true },
      update: { sortOrder, isActive: true },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: 'cafe' },
    create: {
      key: 'cafe',
      value: {
        profile: { cafeName: 'Cafe Bloc Barat', phone: '+62 812-0000-0000', address: 'Krui, Pesisir Barat, Lampung' },
        tax: { taxRate: 5, serviceRate: 0, currency: 'IDR' },
        payments: { cash: true, qris: true, transfer: false },
        qrOptions: { guestOrdering: true, customerName: true, callWaiter: true, autoAcceptQr: false },
        hours: [
          { label: 'Monday - Thursday', open: '09:00', close: '22:00', isOpen: true },
          { label: 'Friday', open: '08:00', close: '23:00', isOpen: true },
          { label: 'Saturday - Sunday', open: '08:00', close: '23:00', isOpen: true },
        ],
      },
    },
    update: {},
  });

  for (const [code, name, area, seats, status, scansToday] of tables) {
    await prisma.table.upsert({
      where: { code },
      create: { code, name, area, seats, status, qrToken: `table-${code.toLowerCase()}-token`, scansToday },
      update: { name, area, seats, status, scansToday },
    });
  }

  for (const [category, name, description, price, oldPrice, isAvailable, isBestSeller, badge, imageUrl] of menuItems) {
    const categoryRecord = await prisma.category.findUniqueOrThrow({ where: { name: category } });
    const existing = await prisma.menuItem.findFirst({ where: { name } });
    const data = { categoryId: categoryRecord.id, description, price, oldPrice, imageUrl, isAvailable, isBestSeller, badge };
    if (existing) {
      await prisma.menuItem.update({ where: { id: existing.id }, data });
    } else {
      await prisma.menuItem.create({ data: { name, ...data } });
    }
  }

  const orderSeeds = [
    { orderNumber: '925', tableCode: 'A4', customerName: 'Ariel Hikmat', type: 'dine_in' as const, status: 'ready' as const, source: 'qr' as const, guests: 4, subtotal: 73790, tax: 3650, serviceCharge: 9900, total: 87340, notes: 'make the dish a bit spicy' },
    { orderNumber: '921', tableCode: 'B2', customerName: 'Denis Freeman', type: 'dine_in' as const, status: 'preparing' as const, source: 'manual' as const, guests: 2, subtotal: 54880, tax: 2990, serviceCharge: 0, total: 57870, notes: null },
    { orderNumber: '916', tableCode: null, customerName: 'Morgan Cox', type: 'takeaway' as const, status: 'pending' as const, source: 'qr' as const, guests: 1, subtotal: 82820, tax: 4140, serviceCharge: 0, total: 86960, notes: null },
    { orderNumber: '919', tableCode: null, customerName: 'Paul Rey', type: 'takeaway' as const, status: 'preparing' as const, source: 'manual' as const, guests: 1, subtotal: 93295, tax: 4665, serviceCharge: 0, total: 97960, notes: null },
  ];

  const seededOrders = new Map<string, bigint>();
  for (const seed of orderSeeds) {
    const table = seed.tableCode ? await prisma.table.findUniqueOrThrow({ where: { code: seed.tableCode } }) : null;
    const order = await prisma.order.upsert({
      where: { orderNumber: seed.orderNumber },
      create: {
        orderNumber: seed.orderNumber,
        tableId: table?.id,
        customerName: seed.customerName,
        type: seed.type,
        status: seed.status,
        source: seed.source,
        guests: seed.guests,
        subtotal: seed.subtotal,
        tax: seed.tax,
        serviceCharge: seed.serviceCharge,
        total: seed.total,
        notes: seed.notes,
      },
      update: {
        tableId: table?.id,
        status: seed.status,
        total: seed.total,
      },
    });
    seededOrders.set(seed.orderNumber, order.id);
  }

  const orderItems = [
    ['925', 'Scrambled Eggs With Toast', 1, 'Extra egg'],
    ['925', 'Smoked Salmon Bagel', 1, null],
    ['925', 'Belgian Waffles', 2, 'Extra honey'],
    ['925', 'Bloc Barat Latte', 1, null],
    ['921', 'Chicken Rice Bowl', 1, null],
    ['921', 'Crispy Fries', 1, null],
    ['916', 'Chicken Rice Bowl', 1, null],
    ['916', 'Krui Sunset Mocktail', 1, null],
  ] as const;

  for (const [orderNumber, menuName, quantity, notes] of orderItems) {
    const orderId = seededOrders.get(orderNumber);
    const menuItem = await prisma.menuItem.findFirstOrThrow({ where: { name: menuName } });
    if (!orderId) continue;
    const existing = await prisma.orderItem.findFirst({ where: { orderId, menuItemId: menuItem.id } });
    if (!existing) {
      await prisma.orderItem.create({ data: { orderId, menuItemId: menuItem.id, quantity, unitPrice: menuItem.price, notes } });
    }
  }

  for (const [orderNumber, tableCode] of [['925', 'A4'], ['921', 'B2']] as const) {
    const orderId = seededOrders.get(orderNumber);
    if (orderId) await prisma.table.update({ where: { code: tableCode }, data: { currentOrderId: orderId } });
  }

}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
