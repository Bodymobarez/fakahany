'use client';

import { useEffect, useState } from 'react';

function formatRemaining(ms: number) {
  if (ms <= 0) return 'Ended';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FlashCountdown({ endsAt }: { endsAt: string | Date }) {
  const end = new Date(endsAt).getTime();
  const [label, setLabel] = useState(() => formatRemaining(end - Date.now()));

  useEffect(() => {
    const t = setInterval(() => setLabel(formatRemaining(end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);

  return (
    <p className="mb-6 text-sm font-medium tracking-wide text-citrus-300/95">
      Ends in <span className="font-semibold text-citrus-200">{label}</span>
    </p>
  );
}
