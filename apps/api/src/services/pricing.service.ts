import { prisma } from '../lib/prisma';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve cart/checkout unit price:
 * 1) variant or base
 * 2) active flash sale if lower
 * 3) B2B price-list override for the user's groups
 * 4) else customer-group % discount
 */
export async function resolveUnitPrice(opts: {
  productId: string;
  variantId?: string | null;
  userId?: string | null;
  basePrice?: number;
  variantPrice?: number | null;
}): Promise<{ unitPrice: number; source: string }> {
  let unit = 0;
  let source = 'base';

  if (opts.basePrice != null && (!opts.variantId || opts.variantPrice != null)) {
    unit =
      opts.variantId != null && opts.variantPrice != null
        ? Number(opts.variantPrice)
        : Number(opts.basePrice);
    source = opts.variantId ? 'variant' : 'base';
  } else {
    const product = await prisma.product.findUnique({ where: { id: opts.productId } });
    if (!product) return { unitPrice: 0, source: 'missing' };
    unit = Number(product.basePrice);
    source = 'base';
    if (opts.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: opts.variantId, productId: opts.productId, isActive: true },
      });
      if (variant) {
        unit = Number(variant.price);
        source = 'variant';
      }
    }
  }

  const now = new Date();
  const flash = await prisma.flashSaleItem.findFirst({
    where: {
      productId: opts.productId,
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    orderBy: { salePrice: 'asc' },
  });
  if (flash && Number(flash.salePrice) < unit) {
    unit = Number(flash.salePrice);
    source = 'flash';
  }

  if (opts.userId) {
    const memberships = await prisma.customerGroupMember.findMany({
      where: { userId: opts.userId },
      include: {
        group: {
          include: {
            priceLists: {
              where: { isActive: true },
              include: {
                items: {
                  where: {
                    OR: [
                      { productId: opts.productId, productVariantId: null },
                      ...(opts.variantId ? [{ productVariantId: opts.variantId }] : []),
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });

    let listPrice: number | null = null;
    let maxGroupDiscount = 0;
    for (const m of memberships) {
      if (m.group.discount != null) {
        maxGroupDiscount = Math.max(maxGroupDiscount, Number(m.group.discount));
      }
      for (const list of m.group.priceLists) {
        for (const item of list.items) {
          const price = Number(item.price);
          if (listPrice == null || price < listPrice) listPrice = price;
        }
      }
    }

    if (listPrice != null) {
      return { unitPrice: round2(listPrice), source: 'b2b' };
    }
    if (maxGroupDiscount > 0) {
      unit = unit * (1 - maxGroupDiscount / 100);
      source = source === 'flash' ? 'flash+group' : 'group';
    }
  }

  return { unitPrice: round2(unit), source };
}

/** Refresh every cart line to current resolved prices (flash/B2B). */
export async function refreshCartItemPrices(cartId: string, userId?: string | null) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true, variant: true },
  });
  for (const item of items) {
    const { unitPrice } = await resolveUnitPrice({
      productId: item.productId,
      variantId: item.variantId,
      userId,
      basePrice: Number(item.product.basePrice),
      variantPrice: item.variant ? Number(item.variant.price) : null,
    });
    if (Number(item.unitPrice) !== unitPrice) {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { unitPrice },
      });
    }
  }
}
