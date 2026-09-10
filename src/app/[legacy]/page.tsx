import { notFound, redirect } from 'next/navigation';
import { sourceHref, sourceRoutes } from '@/lib/routes';

/** Compatibility only: every business screen has its own explicit App Router file. */
export default async function LegacyRedirect({ params, searchParams }: { params: Promise<{ legacy: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { legacy } = await params;
  const file = legacy.endsWith('.html') ? legacy : `${legacy}.html`;
  if (!(file in sourceRoutes)) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) for (const item of value) query.append(key, item);
    else if (value !== undefined) query.set(key, value);
  }
  redirect(sourceHref(file + (query.size ? `?${query.toString()}` : '')));
}
