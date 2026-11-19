import { PageContainer } from '@/components/dashboard-layout/page-container';
import { AccessDenied } from '@/components/dashboard-layout/access-denied';

export default function DashboardForbidden() {
  return (
    <PageContainer>
      <AccessDenied />
    </PageContainer>
  );
}
