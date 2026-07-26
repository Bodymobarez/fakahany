import { formatMoneyAmount } from '@fv/shared';
import { AedSymbol } from './AedSymbol';

export interface PriceProps {
  amount: number | string;
  className?: string;
  symbolClassName?: string;
  symbolSrc?: string;
}

export function Price({
  amount,
  className,
  symbolClassName,
  symbolSrc,
}: PriceProps) {
  return (
    <span className={className}>
      <AedSymbol className={symbolClassName} src={symbolSrc} />
      {formatMoneyAmount(amount)}
    </span>
  );
}
