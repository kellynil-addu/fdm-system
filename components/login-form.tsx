'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { login } from '@/lib/auth';

export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      const next = searchParams.get('next') || '/dashboard';
      router.push(next);
      // Without this the router can serve a cached RSC payload rendered before
      // the auth cookie existed, so the proxy bounces straight back to /login.
      // Refresh router so newly set auth cookies take effect in RSC payload.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    error,
    handleSubmit,
  };
}

/**
 * Interactive part of the login page.
 *
 * Reads the `next` query param via `useSearchParams`, which opts this subtree
 * out of prerendering — it must stay inside a <Suspense> boundary so the rest
 * of the page can still be prerendered. See app/(auth)/login/page.tsx.
 */
export function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    error,
    handleSubmit,
  } = useLoginForm();

  return (
    <>
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Login Card */}
      <Card className="p-8 bg-white border-[#E2E7EC] rounded-2xl shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#1A1D20] font-medium text-sm">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="bg-[#F9FAFB] border-[#E2E7EC] text-[#1A1D20] placeholder:text-[#A0A8B0] focus:border-[#5BC4E7] focus:ring-[#5BC4E7] rounded-lg"
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#1A1D20] font-medium text-sm">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-[#F9FAFB] border-[#E2E7EC] text-[#1A1D20] placeholder:text-[#A0A8B0] focus:border-[#5BC4E7] focus:ring-[#5BC4E7] rounded-lg"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#5BC4E7] text-white hover:bg-[#4AADE0] rounded-lg h-11 font-semibold mt-6"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2E7EC]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-[#6C7E8E]">or</span>
          </div>
        </div>

        {/* Password recovery */}
        <div className="flex flex-col space-y-3">
          <Link href="/auth/forgot-password">
            <Button
              variant="ghost"
              className="w-full text-[#F5CE42] hover:bg-[#FFF9E5] font-medium"
            >
              Forgot Password?
            </Button>
          </Link>
        </div>
      </Card>
    </>
  );
}

/** Placeholder shown while the login form hydrates. Mirrors the card's footprint. */
export function LoginFormFallback() {
  return (
    <Card className="p-8 bg-white border-[#E2E7EC] rounded-2xl shadow-lg">
      <div className="animate-pulse space-y-5">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-[#E2E7EC]" />
          <div className="h-9 w-full rounded-lg bg-[#F9FAFB] border border-[#E2E7EC]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-[#E2E7EC]" />
          <div className="h-9 w-full rounded-lg bg-[#F9FAFB] border border-[#E2E7EC]" />
        </div>
        <div className="h-11 w-full rounded-lg bg-[#E2E7EC] mt-6" />
        <div className="h-9 w-full rounded-lg bg-[#F9FAFB]" />
      </div>
    </Card>
  );
}
