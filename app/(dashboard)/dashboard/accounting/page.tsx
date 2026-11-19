import { PageContainer } from '@/components/dashboard-layout/page-container';
import { UnderDevelopment } from '@/components/dashboard-layout/under-development';
import { verifyPageAccess } from '@/lib/actions/auth-guard';

export default async function AccountingPage() {
  await verifyPageAccess('accounting.read');

  return (
    <PageContainer>
      <UnderDevelopment feature="Accounts Payable" />
    </PageContainer>
  );
}
