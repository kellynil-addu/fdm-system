import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the container handles vertical scrolling.
   * Supports `true` (overflow-y-auto), `false` (overflow-hidden),
   * or `'responsive'` (page scroll on mobile, locked full-height on desktop).
   */
  scrollable?: boolean | 'responsive';
  /**
   * Whether to apply standard page padding (`p-8`).
   * Defaults to `true`. Set to `false` for full-bleed edge-to-edge layouts.
   */
  padding?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard container for dashboard pages.
 */
export function PageContainer({
  scrollable = true,
  padding = true,
  className,
  children,
  ...props
}: PageContainerProps) {
  const scrollClasses =
    scrollable === 'responsive'
      ? 'overflow-y-auto md:overflow-hidden md:h-full'
      : scrollable
      ? 'overflow-y-auto'
      : 'overflow-hidden';

  const paddingClasses =
    padding &&
    (scrollable === 'responsive'
      ? 'min-h-full md:min-h-0 p-4 sm:p-8'
      : 'min-h-full p-4 sm:p-8');

  return (
    <div
      className={cn(
        'flex-1 min-h-0 h-full flex flex-col',
        scrollClasses,
        paddingClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

