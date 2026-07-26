import { Router } from 'express';
import { z } from 'zod';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { checkoutCart } from '../services/order.service';

export const checkoutRouter = Router();

const checkoutSchema = z.object({
  cartId: z.string().min(1),
  addressId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  deliveryType: z.nativeEnum(DeliveryType).default(DeliveryType.SAME_DAY),
  deliverySlotStart: z.coerce.date().optional().nullable(),
  deliverySlotEnd: z.coerce.date().optional().nullable(),
  deliveryNotes: z.string().max(500).optional().nullable(),
  couponCode: z.string().optional().nullable(),
  walletAmount: z.number().nonnegative().optional().nullable(),
  /** Whole reward points to redeem (100 pts = 1 AED). */
  pointsToRedeem: z.number().int().nonnegative().optional().nullable(),
});

checkoutRouter.post('/', authenticate, validate(checkoutSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof checkoutSchema>;
    const result = await checkoutCart({
      userId: req.user!.sub,
      ...body,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
