import { Suspense } from 'react';
import { PropertyLotsSection } from '@/components/dashboard-properties/property-lots-section';
import { PropertiesSkeleton } from '@/components/dashboard-layout/page-skeletons';
import { PageContainer } from '@/components/dashboard-layout/page-container';
import { getProjectAreas } from '@/lib/actions/project-areas';
import { verifyPageAccess } from '@/lib/actions/auth-guard';

async function PropertiesContent() {
  await verifyPageAccess('properties.read');
  const projectAreas = await getProjectAreas();

  return (
    <div className="flex flex-col gap-6 pt-4 sm:pt-8 pb-6 sm:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Property Lots</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Raw land inventory across the company&apos;s project areas.
        </p>
      </div>
      <PropertyLotsSection projectAreas={projectAreas} />
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <PageContainer padding="horizontal">
      <Suspense fallback={<PropertiesSkeleton />}>
        <PropertiesContent />
      </Suspense>
    </PageContainer>
  );
}
