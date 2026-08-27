import type { CustomerMenuItem } from './types';

export const customerCategories = ['Coffee', 'Non Coffee', 'Food', 'Snack', 'Signature'] as const;

export const customerMenuItems: CustomerMenuItem[] = [
  {
    id: 1,
    name: 'Bloc Barat Latte',
    category: 'Coffee',
    description: 'Espresso, fresh milk, and smooth house syrup.',
    price: 32000,
    badge: 'Signature',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 2,
    name: 'Krui Sunset Mocktail',
    category: 'Signature',
    description: 'Tropical citrus, soda, and beach-day freshness.',
    price: 36000,
    badge: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 3,
    name: 'Iced Americano',
    category: 'Coffee',
    description: 'Clean espresso over ice for a bright afternoon.',
    price: 26000,
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 4,
    name: 'Chicken Rice Bowl',
    category: 'Food',
    description: 'Grilled chicken, warm rice, egg, and house sauce.',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 5,
    name: 'Crispy Fries',
    category: 'Snack',
    description: 'Golden fries with Bloc Barat dipping sauce.',
    price: 28000,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 6,
    name: 'Matcha Cloud',
    category: 'Non Coffee',
    description: 'Creamy matcha latte with a soft vanilla finish.',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
  },
];
