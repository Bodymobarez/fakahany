import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodEffects, ZodTypeAny } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject> | ZodTypeAny;

export function validate(schema: Schema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[source]);
    (req as Request & Record<string, unknown>)[source] = parsed;
    next();
  };
}
