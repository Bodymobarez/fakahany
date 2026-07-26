'use client';

import { useState } from 'react';
import { getAuthToken } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function ImageUrlField({
  label = 'Image',
  value,
  onChange,
  required = false,
  onError,
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  onError?: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function onUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = (await res.json()) as { file: { url: string } };
      onChange(data.file.url);
    } catch {
      onError?.('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex flex-wrap gap-2">
        <input
          required={required}
          className={`${fieldClass} min-w-[12rem] flex-1`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload"
        />
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {uploading ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void onUpload(e.target.files)}
          />
        </label>
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveUrl(value)}
          alt=""
          className="h-20 w-32 rounded-lg border border-slate-200 object-cover"
        />
      ) : null}
    </div>
  );
}
