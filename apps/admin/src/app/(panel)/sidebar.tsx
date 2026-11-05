'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { authPost } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/menu', label: 'Weekly menu' },
  { href: '/overrides', label: 'Date specials' },
  { href: '/menu-items', label: 'Menu items' },
  { href: '/plans', label: 'Plans & pricing' },
  { href: '/addons', label: 'Add-ons' },
  { href: '/flavours', label: 'Flavours' },
  { href: '/holidays', label: 'Holidays' },
  { href: '/settings', label: 'Settings' },
  { href: '/otps', label: 'Login codes' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await authPost('/logout', {}).catch(() => undefined);
    // Full reload on purpose: drops every cached query from the ended session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  };

  return (
    <aside className="border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-3 md:py-5">
        <Link href="/" className="text-lg font-semibold text-emerald-800">
          Way2meal
        </Link>
        <button
          className="rounded-md px-2 py-1 text-sm md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      <nav className={`${open ? 'block' : 'hidden'} px-2 pb-3 md:block`}>
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm ${active ? 'bg-emerald-50 font-medium text-emerald-800' : 'text-zinc-700 hover:bg-zinc-100'}`}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100"
        >
          Sign out
        </button>
      </nav>
    </aside>
  );
}
