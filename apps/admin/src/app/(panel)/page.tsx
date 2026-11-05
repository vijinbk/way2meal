import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';

const LINKS = [
  {
    href: '/menu',
    title: 'Weekly menu',
    text: 'Set what is served each weekday, and preview any week.',
  },
  { href: '/overrides', title: 'Date specials', text: 'Change the menu for a single date.' },
  { href: '/plans', title: 'Plans & pricing', text: 'Prices, meal counts and skip limits.' },
  { href: '/addons', title: 'Add-ons', text: 'Extras, prices and daily stock.' },
  { href: '/holidays', title: 'Holidays', text: 'Days the kitchen is closed.' },
  { href: '/settings', title: 'Settings', text: 'Cutoff times, service days, UPI details.' },
];

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Today's counts, pending payments and the prep sheet arrive in M5."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full transition-colors hover:border-emerald-600">
              <p className="font-semibold">{l.title}</p>
              <p className="mt-1 text-sm text-zinc-600">{l.text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
