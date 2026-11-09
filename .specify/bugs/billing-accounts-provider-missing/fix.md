# Bug Fix: Decouple BillingPaymentModal from Unconditional BillingAccountsProvider

- **Slug**: billing-accounts-provider-missing
- **Fixed**: 2026-11-09T01:02:40Z
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Decoupled `BillingPaymentModal` from an unconditional `useBillingAccounts()` hook requirement by replacing it with direct `recordLedgerPayment` execution via `useMutation` and safe optional context consumption (`useOptionalBillingAccounts`), allowing the modal to mount and record payments cleanly on both the standalone detail workspace (`/dashboard/billing/[accountId]`) and the list view (`/dashboard/billing`).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `components/dashboard-billing/billing-payment-modal.tsx` | modified | Replaced `useBillingAccounts()` with `useMutation(recordLedgerPayment)` and optional `useOptionalBillingAccounts()` |
| `lib/hooks/use-billing-accounts.tsx` | modified | Exported `BillingAccountsContext` and added `useOptionalBillingAccounts()` helper |
| `scripts/tests/billing/billing-ui-conventions.test.ts` | modified | Added invariant test ensuring `billing-payment-modal.tsx` does not require unconditional `BillingAccountsProvider` |

## Diff Highlights (optional)

```tsx
// lib/hooks/use-billing-accounts.tsx
export const BillingAccountsContext = createContext<BillingAccountsContextValue | null>(null);

export function useOptionalBillingAccounts() {
  return useContext(BillingAccountsContext);
}
```

```tsx
// components/dashboard-billing/billing-payment-modal.tsx
export function BillingPaymentModal({
  account,
  open,
  onOpenChange,
  onSuccess,
}: BillingPaymentModalProps) {
  const billingAccounts = useOptionalBillingAccounts();

  const { execute, state } = useMutation(recordLedgerPayment, {
    onSuccess: async (data) => {
      toast.success(`Payment recorded under OR# ${data.or_number}`);
      reset();
      onOpenChange(false);
      if (billingAccounts) {
        billingAccounts.setActiveModal(null);
        const targetAccountId = data.account_id ?? account.account_id;
        if (targetAccountId) {
          await billingAccounts.refreshAccount(targetAccountId);
        }
      }
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to record payment');
    },
  });

  const isRecordingPayment = state.status === 'pending';
```

## Tests Added or Updated

- `scripts/tests/billing/billing-ui-conventions.test.ts::guarantees billing-payment-modal does not require an unconditional BillingAccountsProvider` — Verifies `BillingPaymentModal` does not invoke `useBillingAccounts()` directly, eliminating runtime crashes outside `BillingAccountsProvider`.

## Local Verification

- Commands run:
  - `npx tsc --noEmit` → Passed (0 errors).
  - `npx vitest run scripts/tests/billing/billing-ui-conventions.test.ts` → Passed (4/4 tests passed).

## Deviations from Assessment

None. The preferred remediation was implemented exactly as specified.

## Follow-ups

- Verify end-to-end payment posting workflow via `/speckit-bug-test slug=billing-accounts-provider-missing`.
