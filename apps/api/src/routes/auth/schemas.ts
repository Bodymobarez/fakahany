import { z } from 'zod';

export const addressSchema = z.object({
  emirate: z.string().min(1).max(80),
  area: z.string().min(1).max(120),
  street: z.string().min(1).max(200),
  building: z.string().min(1).max(120),
  floor: z.string().max(40).optional().nullable(),
  apartment: z.string().max(40).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  label: z.string().max(80).optional(),
});

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs a special character');

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(40)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Username may contain letters, numbers, . _ -')
      .optional()
      .nullable(),
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20).optional(),
    password: passwordSchema,
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    address: addressSchema.optional(),
  })
  .refine((d) => d.email || d.phone, { message: 'Email or phone required' });

export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20).optional(),
    password: z.string().min(1),
    totp: z.string().length(6).optional(),
  })
  .refine((d) => d.email || d.phone, { message: 'Email or phone required' });

export const oauthSchema = z.object({
  provider: z.enum(['google', 'apple', 'facebook']),
  idToken: z.string().min(1).optional(),
  deviceId: z.string().min(8).max(80).optional(),
  totp: z.string().length(6).optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
});

export const otpRequestSchema = z.object({ phone: z.string().min(7).max(20) });
export const otpVerifySchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(6),
});

export const passwordForgotSchema = z.object({ email: z.string().email() });
export const passwordResetSchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  password: passwordSchema,
});

export const totpTokenSchema = z.object({ token: z.string().length(6) });
