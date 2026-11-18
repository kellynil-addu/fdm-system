import { Suspense } from 'react';
import { ProjectAreaMapUnifiedView } from '@/components/dashboard-properties/map-project-area-unified-view';
import { ProjectAreaMapSkeleton } from '@/components/dashboard-layout/page-skeletons';
import { PageContainer } from '@/components/dashboard-layout/page-container';
import { getAllProjectAreasWithLots } from '@/lib/actions/project-areas';
import { verifyPageAccess } from '@/lib/actions/auth-guard';

async function ProjectAreaMapContent() {
  await verifyPageAccess('properties.read');
  const projectAreas = await getAllProjectAreasWithLots();

  return <ProjectAreaMapUnifiedView projectAreas={projectAreas} />;
}

export default async function ProjectAreaMapPage() {
  return (
    <PageContainer padding={false} scrollable={false}>
      <Suspense fallback={<ProjectAreaMapSkeleton />}>
        <ProjectAreaMapContent />
      </Suspense>
    </PageContainer>
  );
}
