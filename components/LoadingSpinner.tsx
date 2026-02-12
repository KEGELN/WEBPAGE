'use client';

import clsx from 'clsx';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
}

export default function LoadingSpinner({
  label = 'Loading...',
  className,
  size = 'md',
  overlay = false,
}: LoadingSpinnerProps) {
  const sizeClass =
    size === 'lg'
      ? 'h-16 w-16 border-[6px]'
      : size === 'sm'
      ? 'h-8 w-8 border-[3px]'
      : 'h-10 w-10 border-4';

  const sizeBoxClass = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 text-foreground/80',
        overlay ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : 'py-10',
        className
      )}
    >
      <div className={clsx('relative', sizeBoxClass)}>
        <div className={clsx('absolute inset-0 rounded-full border-muted opacity-60', sizeClass)} />
        <div className={clsx('absolute inset-0 rounded-full border-transparent border-t-primary animate-spin', sizeClass)} />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
