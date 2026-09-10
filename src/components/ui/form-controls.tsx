import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cn('input', className)} />;
}
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={cn('textarea', className)} />;
}
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={cn('select', className)} />;
}
export function Field({ label, htmlFor, help, error, children, className }: { label: ReactNode; htmlFor: string; help?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return <div className={cn('field', className)}><label htmlFor={htmlFor}>{label}</label>{children}{help && <p id={`${htmlFor}-help`} className="field-help">{help}</p>}{error && <p id={`${htmlFor}-error`} className="field-error" role="alert">{error}</p>}</div>;
}
