import { Suspense } from 'react';
import { PageContainer } from '@/components/dashboard-layout/page-container';
import { PropertiesSkeleton } from '@/components/dashboard-layout/page-skeletons';
import { BillingRecordsSection } from '@/components/dashboard-billing/billing-records-section';
import { verifyPageAccess } from '@/lib/actions/auth-guard';
import { getBillingAccounts } from '@/lib/actions/billing';

export const dynamic = 'force-dynamic';

async function BillingContent() {
  await verifyPageAccess('billing.read');
  const accounts = await getBillingAccounts({ limit: 500 });

  return (
    <div className="flex flex-col gap-6 pt-4 sm:pt-8 pb-6 sm:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing &amp; Ledgers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage buyer installment accounts, official receipts, penalties, and clearances.
        </p>
      </div>
      <BillingRecordsSection initialAccounts={accounts} />
    </div>
  );
}

export default function BillingPage() {
  return (
    <PageContainer padding="horizontal">
      <Suspense fallback={<PropertiesSkeleton />}>
        <BillingContent />
      </Suspense>
    </PageContainer>
  );
}
