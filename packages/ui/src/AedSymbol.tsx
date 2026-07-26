import type { CSSProperties } from 'react';

export interface AedSymbolProps {
  className?: string;
  src?: string;
}

/** Official UAE Dirham glyph — wider than tall (1000×870). */
const defaultClassName =
  'inline-block h-[1em] w-[1.15em] [text-decoration:inherit]';

export function AedSymbol({
  className = defaultClassName,
  src = '/dirham.svg',
}: AedSymbolProps) {
  const style: CSSProperties = {
    display: 'inline-block',
    verticalAlign: 'middle',
    backgroundColor: 'currentcolor',
    maskImage: `url("${src}")`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
    maskMode: 'alpha',
    WebkitMaskImage: `url("${src}")`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
  };

  return (
    <span
      role="img"
      aria-label="AED"
      className={className}
      style={style}
    />
  );
}
