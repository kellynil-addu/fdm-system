'use client';

import { useState, useRef } from 'react';
import { FileSpreadsheet, Loader2, UploadCloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { importLegacyStatements } from '@/lib/actions/billing';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';
import type { StatementImportSummary } from '@/lib/types/billing';

interface BillingExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BillingExcelImportModal({
  open,
  onOpenChange,
  onSuccess,
}: BillingExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<StatementImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { execute, state } = useMutation(importLegacyStatements, {
    onSuccess: (data) => {
      setSummary(data);
      toast.success(
        `Imported ${data.successful} statement(s)${
          data.flagged_discrepancies > 0
            ? ` with ${data.flagged_discrepancies} discrepancy review items flagged`
            : ''
        }`
      );
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err || 'Failed to import legacy workbook');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setSummary(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const ext = file.name.endsWith('.xls') ? 'xls' : file.name.endsWith('.csv') ? 'csv' : 'xlsx';
      await execute({
        format: ext,
        file_base64: base64,
        file_name: file.name,
        dry_run: false,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Legacy SOA Workbook (Excel / CSV)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Ingest authoritative legacy workbooks (.xlsx, .xls, .csv). Discrepancies are queued for review without breaking import (FR-052, FR-057).
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-primary rounded-xl cursor-pointer bg-muted/20 transition-colors"
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground">
              {file ? file.name : 'Click to select Excel or CSV workbook'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports modern .xlsx, legacy binary .xls (2004+), and CSV
            </p>
          </div>

          {summary && (
            <div className="rounded-lg border border-border p-4 bg-muted/30 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span>Total Statements Processed:</span>
                <span>{summary.total_rows}</span>
              </div>
              <div className="flex items-center justify-between text-success">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Successful Imports:
                </span>
                <span>{summary.successful}</span>
              </div>
              {summary.flagged_discrepancies > 0 && (
                <div className="flex items-center justify-between text-destructive">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Discrepancies Queued:
                  </span>
                  <span>{summary.flagged_discrepancies}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!file || state.status === 'pending'}
            onClick={handleUpload}
          >
            {state.status === 'pending' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Execute Workbook Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
