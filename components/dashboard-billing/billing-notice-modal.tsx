'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MailWarning } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordNoticeSchema, type RecordNoticeInput } from '@/lib/validations/billing';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import type { BillingAccountSummary, DeliveryStatus, NoticeType } from '@/lib/types/billing';

interface BillingNoticeModalProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingNoticeModal({
  account,
  open,
  onOpenChange,
}: BillingNoticeModalProps) {
  const { recordNotice, isRecordingNotice } = useBillingAccounts();

  const today = new Date().toISOString().split('T')[0];

  const nextNoticeType = (() => {
    const existing = account.notices.map((n) => n.notice_type);
    if (!existing.includes('1st Notice')) return '1st Notice';
    if (!existing.includes('2nd Notice')) return '2nd Notice';
    return 'Final Demand';
  })();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RecordNoticeInput>({
    resolver: zodResolver(recordNoticeSchema),
    defaultValues: {
      account_id: account.account_id,
      notice_type: nextNoticeType,
      notice_date: today,
      dispatch_date: today,
      courier_name: 'LBC Express',
      tracking_number: '',
      delivery_status: 'Dispatched',
      remarks: '',
    },
  });

  const onSubmit = async (data: RecordNoticeInput) => {
    await recordNotice(data);
  };

  const clientName = account.client?.full_name ?? 'Buyer';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailWarning className="h-5 w-5 text-destructive" />
            Dispatch Maceda Notice
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {clientName} · {lotLabel} ({account.property.location})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Notice Level</Label>
              <Select
                defaultValue={nextNoticeType}
                onValueChange={(val) => setValue('notice_type', val as NoticeType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Notice">1st Notice (Friendly Reminder)</SelectItem>
                  <SelectItem value="2nd Notice">2nd Notice (Demand Letter)</SelectItem>
                  <SelectItem value="Final Demand">Final Demand (Cancellation)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Delivery Status</Label>
              <Select
                defaultValue="Dispatched"
                onValueChange={(val) => setValue('delivery_status', val as DeliveryStatus)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Return to Sender (RTS)">Return to Sender (RTS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="notice_date" className="text-xs">Notice Date</Label>
              <Input
                id="notice_date"
                type="date"
                {...register('notice_date')}
                className="h-9 text-xs"
              />
              {errors.notice_date && (
                <p className="text-[11px] text-destructive">{errors.notice_date.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dispatch_date" className="text-xs">Dispatch Date</Label>
              <Input
                id="dispatch_date"
                type="date"
                {...register('dispatch_date')}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="courier_name" className="text-xs">Courier Service</Label>
              <Input
                id="courier_name"
                placeholder="e.g. LBC Express, J&T"
                {...register('courier_name')}
                className="h-9 text-xs"
              />
              {errors.courier_name && (
                <p className="text-[11px] text-destructive">{errors.courier_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="tracking_number" className="text-xs">Waybill / Tracking #</Label>
              <Input
                id="tracking_number"
                placeholder="e.g. LBC-981293812"
                {...register('tracking_number')}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="remarks" className="text-xs">Dispatch Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="e.g. Sent via registered mail to registered buyer home address"
              {...register('remarks')}
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="quiet"
              onClick={() => onOpenChange(false)}
              disabled={isRecordingNotice}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isRecordingNotice} className="gap-1.5">
              {isRecordingNotice && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record Notice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
