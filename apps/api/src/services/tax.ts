import { prisma } from '../lib/prisma';

export interface TaxBreakdown {
  vatRate: number;
  taxAmount: number;
  companyName: string;
  trn: string;
}

export async function getCompanyVatRate(): Promise<{ vatRate: number; companyName: string; trn: string }> {
  const settings = await prisma.companySettings.findFirst();
  return {
    vatRate: settings ? Number(settings.vatRate) : Number(process.env.VAT_RATE || 5),
    companyName: settings?.companyName || process.env.COMPANY_NAME || 'Fresh Harvest UAE',
    trn: settings?.trn || process.env.COMPANY_TRN || '100000000000003',
  };
}

/** UAE VAT is typically exclusive: tax = net * rate/100 */
export async function calculateTax(netAmount: number): Promise<TaxBreakdown> {
  const company = await getCompanyVatRate();
  const taxAmount = Math.round(netAmount * (company.vatRate / 100) * 100) / 100;
  return {
    vatRate: company.vatRate,
    taxAmount,
    companyName: company.companyName,
    trn: company.trn,
  };
}

export function applyDiscount(subtotal: number, type: 'PERCENT' | 'FIXED', value: number): number {
  if (type === 'PERCENT') {
    return Math.min(subtotal, Math.round(subtotal * (value / 100) * 100) / 100);
  }
  return Math.min(subtotal, value);
}
