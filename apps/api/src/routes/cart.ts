import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { calculateTax } from '../services/tax';
import { quoteDelivery } from '../services/delivery-zone.service';
import { refreshCartItemPrices, resolveUnitPrice } from '../services/pricing.service';

export const cartRouter = Router();

async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (userId) {
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: { include: { product: { include: { images: true } }, variant: true } },
        coupon: true,
      },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: { include: { product: { include: { images: true } }, variant: true } },
          coupon: true,
        },
      });
    }
    return cart;
  }

  if (!sessionId) throw new AppError(400, 'sessionId required for guest cart', 'SESSION_REQUIRED');
  let cart = await prisma.cart.findFirst({
    where: { sessionId },
    include: {
      items: { include: { product: { include: { images: true } }, variant: true } },
      coupon: true,
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId },
      include: {
        items: { include: { product: { include: { images: true } }, variant: true } },
        coupon: true,
      },
    });
  }
  return cart;
}

async function summarizeCart(
  cart: Awaited<ReturnType<typeof getOrCreateCart>>,
  opts?: { emirate?: string | null; lat?: number | null; lng?: number | null; addressId?: string | null; userId?: string },
) {
  const items = cart.items.map((item) => {
    const unitPrice = Number(item.unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.nameEn,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      imageUrl: item.product.images.find((i) => i.isPrimary)?.url || item.product.images[0]?.url || null,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  let discountAmount = 0;
  if (cart.coupon) {
    discountAmount =
      cart.coupon.type === 'PERCENT'
        ? Math.round(subtotal * (Number(cart.coupon.value) / 100) * 100) / 100
        : Math.min(subtotal, Number(cart.coupon.value));
  }

  let emirate = opts?.emirate ?? null;
  let lat = opts?.lat ?? null;
  let lng = opts?.lng ?? null;
  if (opts?.addressId && opts.userId) {
    const address = await prisma.address.findFirst({
      where: { id: opts.addressId, userId: opts.userId },
    });
    if (address) {
      emirate = address.emirate;
      lat = address.lat;
      lng = address.lng;
    }
  }

  const quote = await quoteDelivery({
    emirate: emirate || 'Dubai',
    lat,
    lng,
    subtotal: Math.max(0, subtotal - discountAmount),
  });
  const deliveryFee = quote.covered ? quote.fee : 15;
  const net = Math.max(0, subtotal - discountAmount + deliveryFee);
  const tax = await calculateTax(net);
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    discountAmount,
    deliveryFee,
    vatAmount: tax.taxAmount,
    total: Math.round((net + tax.taxAmount) * 100) / 100,
    deliveryQuote: quote,
    coupon: cart.coupon
      ? { code: cart.coupon.code, type: cart.coupon.type, value: Number(cart.coupon.value) }
      : null,
  };
}

cartRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const sessionId = (req.headers['x-session-id'] as string) || undefined;
    let cart = await getOrCreateCart(req.user?.sub, sessionId);
    await refreshCartItemPrices(cart.id, req.user?.sub);
    cart = await getOrCreateCart(req.user?.sub, sessionId);
    const addressId = typeof req.query.addressId === 'string' ? req.query.addressId : null;
    const emirate = typeof req.query.emirate === 'string' ? req.query.emirate : null;
    const lat = typeof req.query.lat === 'string' ? Number(req.query.lat) : null;
    const lng = typeof req.query.lng === 'string' ? Number(req.query.lng) : null;
    res.json({
      cart: await summarizeCart(cart, {
        addressId,
        emirate,
        lat,
        lng,
        userId: req.user?.sub,
      }),
    });
  } catch (err) {
    next(err);
  }
});

const addSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  sessionId: z.string().optional(),
});

cartRouter.post('/items', optionalAuth, validate(addSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof addSchema>;
    const product = await prisma.product.findFirst({
      where: { id: body.productId, isActive: true },
      include: { variants: true },
    });
    if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');

    let variantPrice: number | null = null;
    if (body.variantId) {
      const variant = product.variants.find((v) => v.id === body.variantId);
      if (!variant) throw new AppError(404, 'Variant not found', 'VARIANT_NOT_FOUND');
      variantPrice = Number(variant.price);
    }
    const priced = await resolveUnitPrice({
      productId: product.id,
      variantId: body.variantId,
      userId: req.user?.sub,
      basePrice: Number(product.basePrice),
      variantPrice,
    });
    const unitPrice = priced.unitPrice;

    const cart = await getOrCreateCart(req.user?.sub, body.sessionId || (req.headers['x-session-id'] as string));
    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: body.productId,
        variantId: body.variantId ?? null,
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + body.quantity, unitPrice },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: body.productId,
          variantId: body.variantId ?? null,
          quantity: body.quantity,
          unitPrice,
        },
      });
    }

    const refreshed = await getOrCreateCart(req.user?.sub, cart.sessionId || undefined);
    res.status(201).json({ cart: await summarizeCart(refreshed) });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  quantity: z.number().int().min(0),
});

cartRouter.patch('/items/:itemId', optionalAuth, validate(updateSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof updateSchema>;
    const sessionId = (req.headers['x-session-id'] as string) || undefined;
    const cart = await getOrCreateCart(req.user?.sub, sessionId);
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.itemId, cartId: cart.id } });
    if (!item) throw new AppError(404, 'Cart item not found', 'NOT_FOUND');

    if (body.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: body.quantity } });
    }

    const refreshed = await getOrCreateCart(req.user?.sub, sessionId);
    res.json({ cart: await summarizeCart(refreshed) });
  } catch (err) {
    next(err);
  }
});

cartRouter.delete('/items/:itemId', optionalAuth, async (req, res, next) => {
  try {
    const sessionId = (req.headers['x-session-id'] as string) || undefined;
    const cart = await getOrCreateCart(req.user?.sub, sessionId);
    await prisma.cartItem.deleteMany({ where: { id: req.params.itemId, cartId: cart.id } });
    const refreshed = await getOrCreateCart(req.user?.sub, sessionId);
    res.json({ cart: await summarizeCart(refreshed) });
  } catch (err) {
    next(err);
  }
});

const couponSchema = z.object({ code: z.string().min(1) });

cartRouter.post('/coupon', authenticate, validate(couponSchema), async (req, res, next) => {
  try {
    const { code } = req.body as z.infer<typeof couponSchema>;
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new AppError(400, 'Invalid coupon', 'INVALID_COUPON');
    if (coupon.startsAt && coupon.startsAt > new Date()) {
      throw new AppError(400, 'Coupon not active yet', 'COUPON_NOT_STARTED');
    }
    if (coupon.endsAt && coupon.endsAt < new Date()) {
      throw new AppError(400, 'Coupon expired', 'COUPON_EXPIRED');
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new AppError(400, 'Coupon usage limit reached', 'COUPON_EXHAUSTED');
    }
    const cart = await getOrCreateCart(req.user!.sub);
    const subtotal = cart.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
    if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
      throw new AppError(400, 'Order below coupon minimum', 'COUPON_MIN_ORDER');
    }
    await prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    const refreshed = await getOrCreateCart(req.user!.sub);
    res.json({ cart: await summarizeCart(refreshed) });
  } catch (err) {
    next(err);
  }
});

cartRouter.delete('/coupon', authenticate, async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user!.sub);
    await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    const refreshed = await getOrCreateCart(req.user!.sub);
    res.json({ cart: await summarizeCart(refreshed) });
  } catch (err) {
    next(err);
  }
});

/** Merge guest session cart into authenticated user cart after login. */
cartRouter.post(
  '/merge',
  authenticate,
  validate(z.object({ sessionId: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const { sessionId } = req.body as { sessionId: string };
      const userId = req.user!.sub;
      const guestCart = await prisma.cart.findFirst({
        where: { sessionId },
        include: { items: true },
      });
      const userCart = await getOrCreateCart(userId);

      if (guestCart && guestCart.id !== userCart.id) {
        for (const item of guestCart.items) {
          const existing = await prisma.cartItem.findFirst({
            where: {
              cartId: userCart.id,
              productId: item.productId,
              variantId: item.variantId,
            },
          });
          if (existing) {
            await prisma.cartItem.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + item.quantity },
            });
          } else {
            await prisma.cartItem.create({
              data: {
                cartId: userCart.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              },
            });
          }
        }
        await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
        await prisma.cart.delete({ where: { id: guestCart.id } });
      }

      const refreshed = await getOrCreateCart(userId);
      res.json({ cart: await summarizeCart(refreshed) });
    } catch (err) {
      next(err);
    }
  },
);
