import { Router } from 'express';
import { prisma } from '../../lib/prisma';

export const reportsAdminRouter = Router();

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pctChange(today: number, yesterday: number) {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

function relativeTime(date: Date) {
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

reportsAdminRouter.get('/dashboard', async (req, res, next) => {
  try {
    const topDays = Math.min(90, Math.max(1, Number(req.query.topDays || 1)));
    const todayStart = startOfDay();
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const topSince = new Date(Date.now() - topDays * 24 * 60 * 60 * 1000);
    const activeStatuses = [
      'PENDING',
      'ACCEPTED',
      'PREPARING',
      'PACKED',
      'OUT_FOR_DELIVERY',
    ] as const;

    const [
      todayOrders,
      yesterdayOrders,
      customers,
      pendingOrders,
      seriesOrders,
      statusGroups,
      categoryItems,
      activeOrders,
      topItems,
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: todayStart },
          status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
        },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart },
          status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
        },
        select: { total: true },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: since30 },
          status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
        },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: since30 },
            status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
          },
        },
        select: {
          quantity: true,
          lineTotal: true,
          product: {
            select: {
              categories: {
                select: { category: { select: { id: true, nameEn: true, slug: true } } },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.order.findMany({
        where: { status: { in: [...activeStatuses] } },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          deliveryType: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'nameEn', 'sku'],
        where: {
          order: {
            createdAt: { gte: topSince },
            status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
          },
        },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 8,
      }),
    ]);

    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + Number(o.total), 0);
    const todayOrderCount = todayOrders.length;
    const yesterdayOrderCount = yesterdayOrders.length;
    const periodRevenue = seriesOrders.reduce((s, o) => s + Number(o.total), 0);
    const periodOrders = seriesOrders.length;

    const byDay = new Map<string, { date: string; label: string; revenue: number; orders: number }>();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, {
        date: key,
        label: d.toLocaleDateString('en-AE', { month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
      });
    }
    for (const o of seriesOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const row = byDay.get(key);
      if (row) {
        row.revenue += Number(o.total);
        row.orders += 1;
      }
    }

    const categoryMap = new Map<
      string,
      { name: string; slug: string; revenue: number; orders: number; qty: number }
    >();
    for (const item of categoryItems) {
      const cat = item.product.categories[0]?.category;
      const key = cat?.id || 'uncategorized';
      const name = cat?.nameEn || 'Uncategorized';
      const slug = cat?.slug || 'uncategorized';
      const row = categoryMap.get(key) || { name, slug, revenue: 0, orders: 0, qty: 0 };
      row.revenue += Number(item.lineTotal);
      row.qty += item.quantity;
      row.orders += 1;
      categoryMap.set(key, row);
    }
    const byCategory = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const statusDistribution = statusGroups
      .map((g) => ({ status: g.status, count: g._count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      kpis: {
        todayRevenue,
        todayOrders: todayOrderCount,
        customers,
        pendingOrders,
        avgOrder: periodOrders ? Math.round((periodRevenue / periodOrders) * 100) / 100 : 0,
        revenueChange: pctChange(todayRevenue, yesterdayRevenue),
        ordersChange: pctChange(todayOrderCount, yesterdayOrderCount),
        // legacy aliases for older clients
        revenue: todayRevenue,
        orders: todayOrderCount,
      },
      series: Array.from(byDay.values()),
      byCategory,
      statusDistribution,
      activeOrders: activeOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        deliveryType: o.deliveryType,
        itemCount: o._count.items,
        createdAt: o.createdAt,
        relativeTime: relativeTime(o.createdAt),
      })),
      topProducts: topItems.map((p) => ({
        productId: p.productId,
        nameEn: p.nameEn,
        sku: p.sku,
        quantity: p._sum.quantity ?? 0,
        revenue: Number(p._sum.lineTotal || 0),
      })),
      topDays,
    });
  } catch (err) {
    next(err);
  }
});

reportsAdminRouter.get('/sales', async (req, res, next) => {
  try {
    const days = Number(req.query.days || 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: since },
        status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
      },
      select: { createdAt: true, total: true, tax: true, discount: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay = new Map<string, { orders: number; revenue: number; tax: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const row = byDay.get(key) || { orders: 0, revenue: 0, tax: 0 };
      row.orders += 1;
      row.revenue += Number(o.total);
      row.tax += Number(o.tax);
      byDay.set(key, row);
    }

    res.json({
      days,
      series: Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v })),
      totals: {
        orders: orders.length,
        revenue: orders.reduce((s, o) => s + Number(o.total), 0),
        tax: orders.reduce((s, o) => s + Number(o.tax), 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

reportsAdminRouter.get('/top-products', async (req, res, next) => {
  try {
    const days = req.query.days ? Number(req.query.days) : undefined;
    const since = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : undefined;
    const items = await prisma.orderItem.groupBy({
      by: ['productId', 'nameEn', 'sku'],
      where: since
        ? {
            order: {
              createdAt: { gte: since },
              status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
            },
          }
        : undefined,
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20,
    });
    res.json({ products: items });
  } catch (err) {
    next(err);
  }
});

reportsAdminRouter.get('/customers', async (_req, res, next) => {
  try {
    const [total, new30, top] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.order.groupBy({
        by: ['userId'],
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 20,
      }),
    ]);
    const users = await prisma.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    res.json({
      total,
      new30,
      topCustomers: top.map((t) => {
        const u = users.find((x) => x.id === t.userId);
        return {
          userId: t.userId,
          name: u ? `${u.firstName} ${u.lastName}`.trim() : t.userId,
          email: u?.email,
          orders: t._count,
          spend: Number(t._sum.total || 0),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

reportsAdminRouter.get('/delivery', async (_req, res, next) => {
  try {
    const [open, delivered, drivers] = await Promise.all([
      prisma.deliveryAssignment.count({ where: { deliveredAt: null } }),
      prisma.deliveryAssignment.count({ where: { deliveredAt: { not: null } } }),
      prisma.driver.count({ where: { isActive: true } }),
    ]);
    const byStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: {
        status: {
          in: ['ACCEPTED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'],
        },
      },
    });
    res.json({ open, delivered, drivers, byStatus });
  } catch (err) {
    next(err);
  }
});

reportsAdminRouter.get('/marketing', async (_req, res, next) => {
  try {
    const campaigns = await prisma.marketingCampaign.groupBy({
      by: ['channel', 'status'],
      _sum: { sentCount: true },
      _count: true,
    });
    const coupons = await prisma.coupon.findMany({
      select: { code: true, usedCount: true, isActive: true },
      orderBy: { usedCount: 'desc' },
      take: 10,
    });
    res.json({ campaigns, coupons });
  } catch (err) {
    next(err);
  }
});

reportsAdminRouter.get('/low-stock', async (_req, res, next) => {
  try {
    const levels = await prisma.stockLevel.findMany({
      include: { product: true, warehouse: true },
      take: 500,
    });
    const filtered = levels.filter((l) => l.qty <= l.reorderLevel);
    const products = await prisma.product.findMany({
      where: { isActive: true, stockQty: { lte: 10 } },
      select: { id: true, nameEn: true, sku: true, stockQty: true },
      take: 50,
    });
    res.json({ levels: filtered, products });
  } catch (err) {
    next(err);
  }
});
