import { Suspense } from 'react';
import { FdmLogo } from '@/components/fdm-logo';
import { LoginForm, LoginFormFallback } from '@/components/login-form';

/**
 * The form reads the `next` query param with `useSearchParams`, which opts its
 * subtree out of prerendering. Keeping it behind <Suspense> lets the branding
 * above still be prerendered — without the boundary the production build fails
 * to prerender this route entirely.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#E8F4FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8 space-y-3">
          <div className="flex justify-center">
            <FdmLogo className="h-24 w-36 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1D20]">FDM System</h1>
            <p className="text-sm text-[#6C7E8E] mt-1">First Davao Millennium Property Ventures</p>
          </div>
        </div>

        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
