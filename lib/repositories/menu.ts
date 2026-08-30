import { prisma } from '../prisma';
import type { PosCategory, PosMenuItem } from '../pos-types';
import { toId, toNumber, todayStart, toBigInt } from './helpers';

export type MenuItemPayload = {
  name: string;
  category: string;
  description?: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string;
  isAvailable?: boolean;
  isBestSeller?: boolean;
  badge?: string | null;
};

async function resolveCategoryId(categoryName: string) {
  const name = categoryName.trim() || 'Coffee';
  const existingCategory = await prisma.category.findUnique({ where: { name } });

  if (existingCategory) return existingCategory.id;

  const lastCategory = await prisma.category.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      name,
      sortOrder: (lastCategory?.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });

  return category.id;
}

export async function getCategories(): Promise<PosCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return categories.map((category) => ({
    id: toId(category.id),
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  }));
}

export async function getMenuItems({ includeHidden = true } = {}): Promise<PosMenuItem[]> {
  const menuItems = await prisma.menuItem.findMany({
    include: { category: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    where: includeHidden ? undefined : { isAvailable: true, category: { isActive: true } },
  });

  const soldToday = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: {
      order: {
        createdAt: { gte: todayStart() },
        status: { not: 'cancelled' },
      },
    },
    _sum: { quantity: true },
  });
  const soldByItemId = new Map(soldToday.map((row) => [toId(row.menuItemId), row._sum.quantity ?? 0]));

  return menuItems.map((item) => ({
    id: toId(item.id),
    categoryId: toId(item.categoryId),
    category: item.category.name,
    name: item.name,
    description: item.description ?? '',
    price: toNumber(item.price),
    oldPrice: item.oldPrice === null ? null : toNumber(item.oldPrice),
    imageUrl: item.imageUrl ?? '',
    isAvailable: item.isAvailable,
    isBestSeller: item.isBestSeller,
    badge: item.badge,
    soldToday: soldByItemId.get(toId(item.id)) ?? 0,
  }));
}

export async function updateMenuItemAvailability(menuItemId: number, isAvailable: boolean) {
  await prisma.menuItem.update({
    where: { id: toBigInt(menuItemId) },
    data: { isAvailable },
  });
}

export async function createMenuItem(input: MenuItemPayload) {
  const categoryId = await resolveCategoryId(input.category);
  const menuItem = await prisma.menuItem.create({
    data: {
      categoryId,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      imageUrl: input.imageUrl?.trim() ?? '',
      isAvailable: input.isAvailable ?? true,
      isBestSeller: input.isBestSeller ?? false,
      badge: input.badge?.trim() || null,
    },
  });

  return { id: toId(menuItem.id) };
}

export async function updateMenuItem(menuItemId: number, input: MenuItemPayload) {
  const categoryId = await resolveCategoryId(input.category);
  await prisma.menuItem.update({
    where: { id: toBigInt(menuItemId) },
    data: {
      categoryId,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      imageUrl: input.imageUrl?.trim() ?? '',
      isAvailable: input.isAvailable ?? true,
      isBestSeller: input.isBestSeller ?? false,
      badge: input.badge?.trim() || null,
    },
  });
}

export async function deleteMenuItem(menuItemId: number) {
  const id = toBigInt(menuItemId);
  const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: id } });

  if (orderItemCount > 0) {
    await prisma.menuItem.update({
      where: { id },
      data: {
        isAvailable: false,
      },
    });

    return { deleted: false, archived: true };
  }

  await prisma.menuItem.delete({ where: { id } });
  return { deleted: true, archived: false };
}
