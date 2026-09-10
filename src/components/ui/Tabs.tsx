'use client';

import { useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TabItem = { value: string; label: ReactNode; disabled?: boolean };
export function Tabs({ items, value, onChange, label, className, id: suppliedId }: { items: TabItem[]; value: string; onChange: (value: string) => void; label: string; className?: string; id?: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const ref = useRef<HTMLDivElement>(null);
  return <div ref={ref} className={cn('tabs', className)} role="tablist" aria-label={label} onKeyDown={(event) => {
    const available = items.filter((item) => !item.disabled);
    const current = available.findIndex((item) => item.value === value);
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % available.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + available.length) % available.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = available.length - 1;
    else return;
    event.preventDefault();
    const item = available[next];
    if (!item) return;
    onChange(item.value);
    ref.current?.querySelector<HTMLButtonElement>(`[data-tab-index="${items.findIndex((entry) => entry.value === item.value)}"]`)?.focus();
  }}>{items.map((item, index) => <button key={item.value} id={`${id}-${item.value}`} data-tab-index={index} type="button" role="tab" aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} disabled={item.disabled} className={value === item.value ? 'active' : undefined} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>;
}
