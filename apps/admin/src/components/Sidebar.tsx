'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminNav } from '@/lib/nav';
import { NavIconMark } from '@/components/NavIcons';

const STORAGE_KEY = 'fv_admin_sidebar_collapsed';

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-sky-500/40 bg-sidebar text-sidebar-text transition-[width] duration-200 ${
        collapsed ? 'w-[4.5rem]' : 'w-64'
      } ${ready ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className={`flex items-center gap-2 border-b border-sidebar-border ${
          collapsed ? 'flex-col px-2 py-3' : 'px-3 py-4'
        }`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border text-slate-200 transition hover:bg-sidebar-muted hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
            )}
          </svg>
        </button>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Admin</div>
            <div className="truncate text-base font-semibold text-white">Fresh Harvest</div>
          </div>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <ul className="space-y-1">
          {adminNav.map((item) => {
            if (item.href) {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-sky-500/20 text-white ring-1 ring-sky-400/50'
                        : 'text-slate-300 hover:bg-sidebar-muted/70 hover:text-white'
                    }`}
                  >
                    <NavIconMark name={item.icon} className="h-5 w-5 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                </li>
              );
            }

            const childActive = item.children?.some((c) => isActive(pathname, c.href));
            const expanded = !collapsed && (open[item.label] ?? Boolean(childActive));
            const firstChild = item.children?.[0]?.href;

            return (
              <li key={item.label}>
                {collapsed ? (
                  <Link
                    href={firstChild || '/dashboard'}
                    title={item.label}
                    className={`flex items-center justify-center rounded-lg px-2.5 py-2 transition ${
                      childActive
                        ? 'bg-sky-500/20 text-white ring-1 ring-sky-400/50'
                        : 'text-slate-300 hover:bg-sidebar-muted/70 hover:text-white'
                    }`}
                  >
                    <NavIconMark name={item.icon} className="h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpen((s) => ({ ...s, [item.label]: !expanded }))}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        childActive
                          ? 'bg-sidebar-muted/70 text-white'
                          : 'text-slate-300 hover:bg-sidebar-muted/70 hover:text-white'
                      }`}
                    >
                      <NavIconMark name={item.icon} className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="text-xs text-slate-400">{expanded ? '−' : '+'}</span>
                    </button>
                    {expanded && item.children ? (
                      <ul className="mt-1 space-y-0.5 border-l border-sidebar-border ml-4 pl-2">
                        {item.children.map((child) => {
                          const active = isActive(pathname, child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`block rounded-md px-2.5 py-1.5 text-[13px] transition ${
                                  active
                                    ? 'bg-teal-700/40 text-white'
                                    : 'text-slate-400 hover:bg-sidebar-muted/50 hover:text-slate-100'
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
