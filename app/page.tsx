import { FeaturesSection } from '@/components/landing/features';
import { Hero } from '@/components/landing/hero';
import { Navbar } from '@/components/landing/navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-card">
      <Navbar />
      <Hero />
      <FeaturesSection />
      <footer className="border-t border-border px-4 py-10 text-center text-sm text-muted-foreground">
        First Davao Millennium Property Ventures Inc.
      </footer>
    </div>
  );
}
