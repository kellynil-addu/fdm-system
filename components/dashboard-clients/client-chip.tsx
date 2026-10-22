'use client';

import { useRouter } from 'next/navigation';
import { UserRound, Phone, Mail, ExternalLink, HelpCircle } from 'lucide-react';
import { IconBox } from '@/components/ui/icon-box';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContactInfo } from '@/lib/types/client';

export interface ClientChipData {
  client_id?: string | null;
  full_name: string;
  status?: string | null;
  address?: string | null;
  contact_info?: ContactInfo[] | null;
  primary_contact?: { type: string; value: string } | null;
}

export interface ClientChipProps {
  client: ClientChipData;
  variant?: 'default' | 'compact';
  /** If false, renders as a static visual block without navigation link */
  interactive?: boolean;
  /** Custom click handler. If provided, intercepts default link navigation */
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
}

export function getClientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClientChip({
  client,
  variant = 'default',
  interactive = true,
  onClick,
  className,
}: ClientChipProps) {
  const router = useRouter();
  const initials = getClientInitials(client.full_name || '');
  const isInactive = Boolean(client.status && client.status.toLowerCase() !== 'active');
  const href = client.client_id ? `/dashboard/clients/${client.client_id}` : null;

  // Extract primary contact: prefer phone, then email, then first available
  const primaryContact = (() => {
    if (client.primary_contact) return client.primary_contact;
    if (!client.contact_info || client.contact_info.length === 0) return null;
    const sorted = [...client.contact_info].sort((a, b) => {
      const aType = a.type.toLowerCase();
      const bType = b.type.toLowerCase();
      const aPhone = aType.includes('phone') || aType.includes('mobile');
      const bPhone = bType.includes('phone') || bType.includes('mobile');
      if (aPhone && !bPhone) return -1;
      if (!aPhone && bPhone) return 1;
      return 0;
    });
    return sorted[0];
  })();

  const ContactIcon = primaryContact?.type.toLowerCase().includes('email')
    ? Mail
    : primaryContact?.type.toLowerCase().includes('phone') || primaryContact?.type.toLowerCase().includes('mobile')
      ? Phone
      : HelpCircle;

  function handleClick(e: React.MouseEvent) {
    if (onClick) {
      e.stopPropagation();
      onClick(e);
      return;
    }
    if (interactive && href) {
      e.stopPropagation();
      router.push(href);
    }
  }

  // --- Compact Mode (Single line, dense for headers and sidebars) ---
  if (variant === 'compact') {
    return (
      <div
        onClick={interactive && href ? handleClick : undefined}
        role={interactive && href ? 'button' : undefined}
        tabIndex={interactive && href ? 0 : undefined}
        onKeyDown={interactive && href ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        } : undefined}
        className={cn(
          'group inline-flex items-center gap-2 rounded-lg border border-border bg-row-hover px-2.5 py-1.5 transition-all text-left',
          interactive && href && 'cursor-pointer hover:border-primary/60 hover:bg-[color-mix(in_srgb,var(--row-hover)_80%,white)]',
          className
        )}
      >
        <IconBox size="sm" shape="rounded-md" className="shrink-0 font-semibold text-[11px] bg-card text-foreground">
          {initials || <UserRound className="h-3 w-3" />}
        </IconBox>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {client.full_name}
            </span>
            {isInactive && (
              <Badge variant="muted" shape="pill" dot className="text-[10px] px-1.5 py-0 shrink-0">
                {client.status}
              </Badge>
            )}
          </div>
          {primaryContact && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
              <ContactIcon className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{primaryContact.value}</span>
            </p>
          )}
        </div>
        {interactive && href && (
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
        )}
      </div>
    );
  }

  // --- Default Mode (Card-style for grids and detail sections) ---
  return (
    <div
      onClick={interactive && href ? handleClick : undefined}
      role={interactive && href ? 'button' : undefined}
      tabIndex={interactive && href ? 0 : undefined}
      onKeyDown={interactive && href ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      } : undefined}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border bg-row-hover p-3 transition-all text-left',
        interactive && href && 'cursor-pointer hover:border-primary/60 hover:bg-[color-mix(in_srgb,var(--row-hover)_80%,white)]',
        className
      )}
    >
      <IconBox size="md" shape="rounded-xl" className="shrink-0 font-semibold text-xs bg-card text-foreground">
        {initials || <UserRound className="h-4 w-4" />}
      </IconBox>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {client.full_name}
          </span>
          {isInactive && (
            <Badge variant="muted" shape="pill" dot className="text-[10px] shrink-0">
              {client.status}
            </Badge>
          )}
        </div>
        {client.address && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {client.address}
          </p>
        )}
        {primaryContact && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ContactIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium text-foreground">{primaryContact.value}</span>
          </div>
        )}
      </div>
      {interactive && href && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary transition-opacity mt-0.5" />
      )}
    </div>
  );
}
