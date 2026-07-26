'use client';

import { useState } from 'react';
import { authFieldClass } from './AuthShell';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.9 5.1A10.5 10.5 0 0121 12c-.7 1.2-1.6 2.3-2.6 3.2M6.1 6.2C4.5 7.5 3.2 9.1 2.1 12c1.8 4.5 6 7.5 9.9 7.5 1.6 0 3.1-.4 4.5-1.1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.1 12C3.9 7.5 8.1 4.5 12 4.5S20.1 7.5 21.9 12C20.1 16.5 15.9 19.5 12 19.5S3.9 16.5 2.1 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

type PasswordFieldProps = {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  showLabel?: string;
  hideLabel?: string;
};

export function PasswordField({
  name = 'password',
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  required,
  minLength = 8,
  placeholder,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink/80">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${authFieldClass} pe-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute inset-y-0 end-0 flex items-center px-3 text-ink/55 transition hover:text-ink"
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </label>
  );
}
