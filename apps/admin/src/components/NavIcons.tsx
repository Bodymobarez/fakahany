import type { ReactNode } from 'react';
import type { NavIcon } from '@/lib/nav';

const paths: Record<NavIcon, ReactNode> = {
  dashboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10.5 12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
    />
  ),
  orders: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3h2l.8 4M7 13h10l3-8H6.2M7 13L5.8 7M7 13l-1.2 5h12.4M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
    />
  ),
  catalog: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h7v7H4V6zm9 0h7v4h-7V6zm0 6h7v7h-7v-7zM4 15h7v4H4v-4z" />
    </>
  ),
  customers: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 8v6M17 11h6"
    />
  ),
  delivery: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7h11v10H3V7zm11 3h4l3 3v4h-7v-7zM7 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
    />
  ),
  sales: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6"
    />
  ),
  finance: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 7h16v10H4V7zm0 3h16M12 10v7"
    />
  ),
  marketing: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 12V6l16-3v15l-16-3v-3zm0 0h8"
    />
  ),
  content: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 4h8l4 4v12a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1zm8 0v4h4M9 13h6M9 17h4"
    />
  ),
  reports: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19V5h4v14H4zm6 0V9h4v10h-4zm6 0v-6h4v6h-4z"
    />
  ),
  people: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 20v-1a4 4 0 014-4h6a4 4 0 014 4v1"
    />
  ),
  settings: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1 1 0 00.2 1.1l.1.1a1.8 1.8 0 11-2.5 2.5l-.1-.1a1 1 0 00-1.1-.2 1 1 0 00-.6.9V19a1.8 1.8 0 11-3.6 0v-.1a1 1 0 00-.6-.9 1 1 0 00-1.1.2l-.1.1a1.8 1.8 0 11-2.5-2.5l.1-.1a1 1 0 00.2-1.1 1 1 0 00-.9-.6H5a1.8 1.8 0 110-3.6h.1a1 1 0 00.9-.6 1 1 0 00-.2-1.1l-.1-.1a1.8 1.8 0 112.5-2.5l.1.1a1 1 0 001.1.2 1 1 0 00.6-.9V5a1.8 1.8 0 113.6 0v.1a1 1 0 00.6.9 1 1 0 001.1-.2l.1-.1a1.8 1.8 0 112.5 2.5l-.1.1a1 1 0 00-.2 1.1 1 1 0 00.9.6H19a1.8 1.8 0 110 3.6h-.1a1 1 0 00-.9.6z"
    />
  ),
};

export function NavIconMark({
  name,
  className = 'h-5 w-5',
}: {
  name: NavIcon;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {paths[name]}
    </svg>
  );
}
