import { getUserInfo } from '@/lib/user';
import { FeaturesSection } from '@/components/landing/features';
import { Hero } from '@/components/landing/hero';
import { Navbar } from '@/components/landing/navbar';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getUserInfo();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-card">
      <Navbar isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <FeaturesSection />
      <footer className="border-t border-border px-4 py-10 text-center text-sm text-muted-foreground">
        First Davao Millennium Property Ventures Inc.
      </footer>
    </div>
  );
}
