'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FdmLogo } from '@/components/shared/fdm-logo';
import { logout } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

interface NavbarProps {
  isLoggedIn?: boolean;
}

export function Navbar({ isLoggedIn: initialIsLoggedIn = false }: NavbarProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsLoggedIn(initialIsLoggedIn);
  }, [initialIsLoggedIn]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsLoggedIn(false);
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
            
          {/* Logo and title at the left */}
          <Link href="/" className="group flex items-center space-x-3">
            <FdmLogo className="h-12 w-16 object-contain" />
            <div className="hidden sm:block">
              <span className="text-sm font-bold leading-tight text-foreground">
                First Davao<br />Millennium
              </span>
            </div>
          </Link>

          {/* Navigation actions at the right */}
          <nav className="flex items-center space-x-3">
            {isLoggedIn ? (
              <>
                <Button
                  asChild
                  variant="secondary"
                  className="font-semibold"
                >
                  <Link href="/dashboard">Continue to Dashboard</Link>
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </Button>
              </>
            ) : (
              <Button
                asChild
                variant="secondary"
                className="font-semibold"
              >
                <Link href="/login">Log In</Link>
              </Button>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
}
