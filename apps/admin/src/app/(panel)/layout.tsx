import { type ReactNode, Suspense } from 'react';
import { Loading } from '@/components/ui';
import { Sidebar } from './sidebar';

/**
 * Panel pages are per-user and use the current date, so they render at request
 * time behind this boundary instead of being prerendered at build.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
    </div>
  );
}
