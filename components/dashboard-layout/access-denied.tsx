'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getPageNameFromPathname } from '@/lib/route-labels';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  pageName?: string;
  description?: string;
}

export function AccessDenied({
  title = 'Access Denied',
  message,
  pageName,
  description = 'Your current account roles do not grant view access to this section. If you need access, please contact your system administrator.',
}: AccessDeniedProps) {
  const router = useRouter();
  const pathname = usePathname();

  const resolvedPageName = pageName ?? (pathname ? getPageNameFromPathname(pathname) : undefined);
  const displayMessage =
    message ??
    (resolvedPageName && resolvedPageName !== 'Dashboard'
      ? `You do not have the required permissions to view ${resolvedPageName}.`
      : 'You do not have the required permissions to view this page.');

  function handleGoBack() {
    // Navigate back in history if available, else fall back to dashboard overview
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center shadow-sm">
        <CardHeader className="items-center pb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--destructive)_12%,var(--card))]">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle role="heading" aria-level={2} className="mt-3 text-xl">{title}</CardTitle>
          <CardDescription className="text-sm font-medium text-foreground">
            {displayMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="default"
            onClick={handleGoBack}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="w-full sm:w-auto"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard overview
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
