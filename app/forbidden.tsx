import Image from 'next/image';
import { AccessDenied } from '@/components/dashboard-layout/access-denied';

export default function RootForbidden() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 flex items-center gap-2">
        <Image
          src="/fdm-logo.png"
          alt="FDM Logo"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          First Davao Millennium
        </span>
      </div>
      <AccessDenied />
    </main>
  );
}
