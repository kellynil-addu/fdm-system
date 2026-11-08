import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/dashboard-layout/page-container';
import { BillingAccountDetailWorkspace } from '@/components/dashboard-billing/billing-account-detail-workspace';
import { verifyPageAccess } from '@/lib/actions/auth-guard';
import { getBillingAccountDetail, generateStatement } from '@/lib/actions/billing';
import { getUserPermissions } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

interface BillingAccountPageProps {
  params: Promise<{
    accountId: string;
  }>;
}

export default async function BillingAccountDetailPage({
  params,
}: BillingAccountPageProps) {
  await verifyPageAccess('billing.read');
  const { accountId } = await params;

  try {
    const [account, statementPayload, permissions] = await Promise.all([
      getBillingAccountDetail(accountId),
      generateStatement(accountId),
      getUserPermissions(),
    ]);

    const canEdit =
      permissions.includes('billing.update') ||
      permissions.includes('billing.create') ||
      permissions.includes('system.admin');

    return (
      <PageContainer padding="horizontal">
        <div className="py-6 sm:py-8">
          <BillingAccountDetailWorkspace
            account={account}
            statementPayload={statementPayload}
            canEdit={canEdit}
          />
        </div>
      </PageContainer>
    );
  } catch {
    notFound();
  }
}
