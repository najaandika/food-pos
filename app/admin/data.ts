import type { View } from './types';

export const navGroups = [
  {
    label: 'Main',
    items: [
      { view: 'dashboard' as View, label: 'Dashboard', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
      { view: 'report' as View, label: 'Report', icon: 'M4 19V5M4 19h16M8 16V9M12 16V6M16 16v-4' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { view: 'menu' as View, label: 'Menu', icon: 'M7 3v18M12 4h7M12 9h7M12 14h7M12 19h7' },
      { view: 'orders' as View, label: 'Orders', icon: 'M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h3' },
      { view: 'cashier' as View, label: 'Cashier', icon: 'M5 6h14v12H5zM8 10h8M8 14h3M16 14h.01M8 18v2M16 18v2' },
      { view: 'waiters' as View, label: 'Waiters', icon: 'M6 21h12M8 21l1-7h6l1 7M5 10a7 7 0 0 1 14 0M4 14h16M12 3v2' },
    ],
  },
  {
    label: 'Owner',
    items: [
      { view: 'owner-menu' as View, label: 'Manage Menu', icon: 'M4 6h16M4 12h16M4 18h10M8 6v12M16 6v6' },
      { view: 'owner-tables' as View, label: 'Tables & QR', icon: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM15 14h2v2h-2zM18 17h2v2h-2zM13 18h2v2h-2z' },
      { view: 'owner-staff' as View, label: 'Staff', icon: 'M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0M18 8h3M19.5 6.5v3' },
    ],
  },
];

export const orders = [
  {
    table: 'A4',
    tone: 'teal',
    name: 'Ariel Hikmat',
    meta: 'Order #925 / Dine In',
    status: 'Ready',
    statusTone: 'ready',
    time: '06:12 PM',
    total: '$87.34',
    items: [
      ['Scrambled eggs with toast', '1', '$16.99'],
      ['Smoked Salmon Bagel', '1', '$18.49'],
      ['Belgian Waffles', '2', '$38.98'],
      ['Classic Lemonade', '1', '$12.49'],
    ],
  },
  {
    table: 'B2',
    tone: 'teal',
    name: 'Denis Freeman',
    meta: 'Order #921 / Dine In',
    status: 'In Progress',
    statusTone: 'progress',
    time: '06:18 PM',
    total: '$57.87',
    items: [
      ['Classic Cheeseburger', '1', '$10.99'],
      ['Fish and Chips', '2', '$34.00'],
      ['Greek Gyro Plate', '1', '$13.99'],
    ],
  },
  {
    table: 'TA',
    tone: 'gold',
    name: 'Morgan Cox',
    meta: 'Order #916 / Takeaway',
    status: 'In Progress',
    statusTone: 'progress',
    time: '06:19 PM',
    total: '$86.96',
    more: '+2 more',
    items: [
      ['Vegetarian Pad Thai', '1', '$16.99'],
      ['Shrimp Tacos', '2', '$19.49'],
      ['Belgian Waffles', '1', '$38.98'],
    ],
  },
  {
    table: 'TA',
    tone: 'gold',
    name: 'Paul Rey',
    meta: 'Order #919 / Takeaway',
    status: 'In Progress',
    statusTone: 'progress',
    time: '06:18 PM',
    total: '$97.96',
    items: [
      ['Margherita Pizza', '1', '$16.99'],
      ['Belgian Waffles', '1', '$19.49'],
      ['Virgin Mojito', '2', '$38.98'],
    ],
  },
  {
    table: 'A9',
    tone: 'teal',
    name: 'Maja Becker',
    meta: 'Order #912 / Dine In',
    status: 'Completed',
    statusTone: 'done',
    time: '05:32 PM',
    total: '$98.34',
    more: '+4 more',
    items: [
      ['Feta Stuffed Mushrooms', '1', '$18.99'],
      ['Lobster Ravioli', '1', '$17.99'],
      ['Thai Coconut Curry', '2', '$14.49'],
    ],
  },
  {
    table: 'C2',
    tone: 'teal',
    name: 'Erwan Richard',
    meta: 'Order #908 / Dine In',
    status: 'Completed',
    statusTone: 'done',
    time: '05:20 PM',
    total: '$56.96',
    more: '+3 more',
    items: [
      ['Creamy Garlic Chicken', '1', '$15.99'],
      ['Greek Gyro Plate', '1', '$13.99'],
      ['Belgian Waffles', '1', '$12.99'],
    ],
  },
];

export const dishes = [
  {
    name: 'Scrambled Eggs With Toast',
    desc: 'Perfectly seasoned scrambled eggs served with warm toast.',
    price: '$16.99',
    qty: 1,
    badge: 'Popular',
    badgeTone: 'popular',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=520&q=80',
  },
  {
    name: 'Greek Yogurt Parfait',
    desc: 'Creamy Greek yogurt layered with ripe fruit and granola.',
    price: '$21.49',
    qty: 0,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=520&q=80',
  },
  {
    name: 'Vegetable Omelette',
    desc: 'Farm-fresh eggs filled with colorful seasonal vegetables.',
    price: '$17.09',
    oldPrice: '$18.99',
    qty: 0,
    badge: 'Disc 10%',
    badgeTone: 'discount',
    image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=520&q=80',
  },
  {
    name: 'Smoked Salmon Bagel',
    desc: 'A savory brunch classic with salmon and cream cheese.',
    price: '$18.99',
    qty: 1,
    image: 'https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?auto=format&fit=crop&w=520&q=80',
  },
  {
    name: 'French Bread & Potato',
    desc: 'Soft mashed potatoes served with fresh French bread.',
    price: '$19.36',
    oldPrice: '$22.49',
    qty: 0,
    badge: 'Disc 12%',
    badgeTone: 'discount',
    image: 'https://images.unsplash.com/photo-1513442542250-854d436a73f2?auto=format&fit=crop&w=520&q=80',
  },
  {
    name: 'Belgian Waffles',
    desc: 'Crisp golden exterior with a soft, buttery interior.',
    price: '$19.49',
    qty: 2,
    image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=520&q=80',
  },
];

