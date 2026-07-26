import { SoldAs } from './enums';

/** Format product sell measure for storefront/admin (e.g. "Box · 2.0 kg"). */
export function formatProductMeasure(input: {
  soldAs?: string | null;
  weight?: number | string | null;
  unit?: string | null;
  packageSize?: string | null;
}): string {
  const packageSize = input.packageSize?.trim();
  if (packageSize) return packageSize;

  const soldAsRaw = (input.soldAs || '').toUpperCase();
  const soldLabel =
    soldAsRaw === SoldAs.BOX || soldAsRaw === 'BOX'
      ? 'Box'
      : soldAsRaw === SoldAs.PIECE || soldAsRaw === 'PIECE'
        ? 'Piece'
        : '';

  const unitRaw = (input.unit || '').trim();
  const weightNum =
    input.weight != null && input.weight !== '' ? Number(input.weight) : NaN;
  const hasWeight = Number.isFinite(weightNum) && weightNum > 0;

  let measure = '';
  if (hasWeight) {
    const formatted =
      weightNum % 1 === 0
        ? weightNum.toFixed(1)
        : String(Number(weightNum.toFixed(2)));
    measure = unitRaw ? `${formatted} ${unitRaw}` : formatted;
  } else if (unitRaw) {
    measure = unitRaw;
  }

  if (soldLabel && measure) return `${soldLabel} · ${measure}`;
  if (soldLabel) return soldLabel;
  return measure;
}
