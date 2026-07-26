import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';

export const addressesRouter = Router();

addressesRouter.use(authenticate);

addressesRouter.get('/', async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.sub },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
});

const addressSchema = z.object({
  label: z.string().min(1).max(80).default('Home'),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional().nullable(),
  area: z.string().max(120).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  building: z.string().max(120).optional().nullable(),
  floor: z.string().max(40).optional().nullable(),
  apartment: z.string().max(40).optional().nullable(),
  city: z.string().min(1).max(80),
  emirate: z.string().min(1).max(80),
  country: z.string().default('UAE'),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  isDefault: z.boolean().optional(),
});

addressesRouter.post('/', validate(addressSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof addressSchema>;
    const userId = req.user!.sub;
    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    const count = await prisma.address.count({ where: { userId } });
    const address = await prisma.address.create({
      data: {
        userId,
        label: body.label,
        line1: body.line1,
        line2: body.line2 ?? null,
        area: body.area ?? null,
        street: body.street ?? null,
        building: body.building ?? null,
        floor: body.floor ?? null,
        apartment: body.apartment ?? null,
        city: body.city,
        emirate: body.emirate,
        country: body.country || 'UAE',
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        isDefault: body.isDefault ?? count === 0,
      },
    });
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
});

addressesRouter.patch('/:id', validate(addressSchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!existing) throw new AppError(404, 'Address not found', 'NOT_FOUND');
    const body = req.body as Partial<z.infer<typeof addressSchema>>;
    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.sub },
        data: { isDefault: false },
      });
    }
    const address = await prisma.address.update({
      where: { id: existing.id },
      data: {
        ...(body.label != null ? { label: body.label } : {}),
        ...(body.line1 != null ? { line1: body.line1 } : {}),
        ...(body.line2 !== undefined ? { line2: body.line2 } : {}),
        ...(body.city != null ? { city: body.city } : {}),
        ...(body.emirate != null ? { emirate: body.emirate } : {}),
        ...(body.country != null ? { country: body.country } : {}),
        ...(body.lat !== undefined ? { lat: body.lat } : {}),
        ...(body.lng !== undefined ? { lng: body.lng } : {}),
        ...(body.area !== undefined ? { area: body.area } : {}),
        ...(body.street !== undefined ? { street: body.street } : {}),
        ...(body.isDefault != null ? { isDefault: body.isDefault } : {}),
      },
    });
    res.json({ address });
  } catch (err) {
    next(err);
  }
});

addressesRouter.delete('/:id', async (req, res, next) => {
  try {
    const result = await prisma.address.deleteMany({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!result.count) throw new AppError(404, 'Address not found', 'NOT_FOUND');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
