'use client';

export function ModeTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex gap-2 rounded-full border border-leaf-200 bg-white/70 p-1 text-sm">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex-1 rounded-full px-3 py-2 font-medium ${
            value === opt.id ? 'bg-leaf-700 text-white' : 'text-ink/70'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
